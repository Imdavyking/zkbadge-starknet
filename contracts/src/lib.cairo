use starknet::ContractAddress;
pub mod erc20;

#[derive(Drop, Serde, starknet::Store)]
struct Feature {
    creator: ContractAddress,
    name: ByteArray,
    description: ByteArray,
    category: ByteArray,
    image_url: ByteArray,
    min_age: u256,
    price: u256,
    created_at: u64,
    is_active: bool,
    coin_type: ContractAddress,
}

#[derive(Copy, Drop, Serde, starknet::Store)]
struct VoteTally {
    up: u64,
    down: u64,
}

#[starknet::interface]
trait IERC20<TContractState> {
    fn transfer_from(
        ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256,
    ) -> bool;
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
}

#[starknet::interface]
pub trait IZkBadge<TContractState> {
    fn verify_honk_proof(
        ref self: TContractState, full_proof_with_hints: Span<felt252>,
    ) -> (bool, Span<u256>);
    fn add_trusted_issuer(ref self: TContractState, issuer: ContractAddress);
    fn remove_trusted_issuer(ref self: TContractState, issuer: ContractAddress);
    fn register(ref self: TContractState, full_proof_with_hints: Span<felt252>);
    fn verify_certificate(ref self: TContractState, hash: u256);
    fn revoke_certificate(ref self: TContractState, cert_hash: u256);
    fn create_feature(
        ref self: TContractState,
        name: ByteArray,
        description: ByteArray,
        category: ByteArray,
        image_url: ByteArray,
        min_age: u16,
        price: u64,
        coin_type: ContractAddress,
    );
    fn access_private_feature(
        ref self: TContractState,
        feature_id: u64,
        full_proof_with_hints: Span<felt252>,
        token_contract: ContractAddress,
    );
    fn vote_on_feature(
        ref self: TContractState, feature_id: u64, like: bool, full_proof_with_hints: Span<felt252>,
    );
    fn withdraw_funds(ref self: TContractState, feature_id: u64, token_contract: ContractAddress);

    // View functions
    fn is_certificate_verified(self: @TContractState, cert_hash: u256) -> bool;
    fn get_feature_votes(self: @TContractState, feature_id: u64) -> VoteTally;
    fn get_feature_info(self: @TContractState, feature_id: u64) -> Feature;
    fn get_owner_certificate(self: @TContractState, owner: ContractAddress) -> u256;
}

#[starknet::contract]
mod IZkBadgeImpl {
    use core::array::ArrayTrait;
    use core::circuit::u384;
    use core::num::traits::Zero;
    use garaga::hashes::poseidon_hash_2_bn254;
    use starknet::event::EventEmitter;
    use starknet::storage::{
        Map, MutableVecTrait, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
        VecTrait,
    };
    use starknet::{
        ContractAddress, SyscallResultTrait, get_block_timestamp, get_caller_address,
        get_contract_address, get_tx_info, syscalls,
    };
    use crate::erc20::{IERC20Dispatcher, IERC20DispatcherTrait};
    use crate::{Feature, VoteTally};
    use super::{IERC20, IZkBadge};

    pub const VERIFIER_CLASSHASH: felt252 =
        0x01a9aa9d61d25fe04260e5e6b9ec7bdbed753a31c99f8cd47e39d6a528bb820b;

    // Enums
    #[derive(Copy, Drop, Serde, starknet::Store)]
    #[allow(starknet::store_no_default_variant)]
    enum Status {
        Pending: (),
        Verified: (),
        Revoked: (),
    }


    #[storage]
    struct Storage {
        admin: ContractAddress,
        feature_balances: Map<u64, u128>,
        trusted_issuers: Map<ContractAddress, bool>,
        registered_hashes: Map<u256, Status>,
        protocol_tvl: Map<felt252, u128>,
        certificate_owners: Map<ContractAddress, u256>,
        features: Map<u64, Feature>,
        feature_counter: u64,
        feature_vote_tallies: Map<u64, VoteTally>,
        verified_users: Map<ContractAddress, bool>,
        user_feature_access: Map<(ContractAddress, u64), bool>,
    }

    #[constructor]
    fn constructor(ref self: ContractState) {
        let tx_info = get_tx_info();
        self.feature_counter.write(0);
        self.admin.write(tx_info.account_contract_address);
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        CertificateVerified: CertificateVerifiedEvent,
        FeatureCreated: FeatureCreatedEvent,
        FeatureAccessed: FeatureAccessedEvent,
        FeatureVoted: FeatureVotedEvent,
    }

    #[derive(Drop, starknet::Event)]
    struct CertificateVerifiedEvent {
        #[key]
        caller: ContractAddress,
        #[key]
        cert_hash: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct FeatureCreatedEvent {
        #[key]
        feature_id: u64,
        #[key]
        creator: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct FeatureAccessedEvent {
        #[key]
        feature_id: u64,
        #[key]
        caller: ContractAddress,
    }

    #[derive(Drop, starknet::Event)]
    struct FeatureVotedEvent {
        #[key]
        feature_id: u64,
        #[key]
        caller: ContractAddress,
        vote: bool,
    }

    fn verify_honk_proof(full_proof_with_hints: Span<felt252>) -> (bool, Span<u256>) {
        let mut result = syscalls::library_call_syscall(
            VERIFIER_CLASSHASH.try_into().unwrap(),
            selector!("verify_ultra_starknet_honk_proof"),
            full_proof_with_hints,
        )
            .unwrap_syscall();

        let public_inputs = Serde::<Option<Span<u256>>>::deserialize(ref result)
            .expect('Deserialization failed')
            .expect('Proof is invalid');
        (true, public_inputs)
    }


    #[abi(embed_v0)]
    impl IZkBadgeImpl of IZkBadge<ContractState> {
        fn verify_honk_proof(
            ref self: ContractState, full_proof_with_hints: Span<felt252>,
        ) -> (bool, Span<u256>) {
            verify_honk_proof(full_proof_with_hints)
        }


        fn add_trusted_issuer(ref self: ContractState, issuer: ContractAddress) {
            assert(get_caller_address() == self.admin.read(), 'Only admin');
            self.trusted_issuers.entry(issuer).write(true);
        }


        fn remove_trusted_issuer(ref self: ContractState, issuer: ContractAddress) {
            assert(get_caller_address() == self.admin.read(), 'Only admin');
            self.trusted_issuers.entry(issuer).write(false);
        }


        fn register(ref self: ContractState, full_proof_with_hints: Span<felt252>) {
            let (is_valid, public_inputs) = verify_honk_proof(full_proof_with_hints);
            assert(is_valid, 'Invalid proof');
            let caller = get_caller_address();
            let cert_hash = *public_inputs.at(0);

            let current_status = self.registered_hashes.entry(cert_hash).read();
            match current_status {
                Status::Pending(()) => {},
                Status::Verified(()) => { assert(false, 'Already verified'); },
                Status::Revoked(()) => { assert(false, 'Certificate revoked'); },
                _ => {},
            }

            self.registered_hashes.entry(cert_hash).write(Status::Verified(()));
            self.certificate_owners.entry(caller).write(cert_hash);
            self.verified_users.entry(caller).write(true);

            self.emit(Event::CertificateVerified(CertificateVerifiedEvent { caller, cert_hash }));
        }


        fn verify_certificate(ref self: ContractState, hash: u256) {
            assert(get_caller_address() == self.admin.read(), 'Only admin');
            self.registered_hashes.entry(hash).write(Status::Verified(()));
        }


        fn revoke_certificate(ref self: ContractState, cert_hash: u256) {
            assert(get_caller_address() == self.admin.read(), 'Only admin');
            self.registered_hashes.entry(cert_hash).write(Status::Revoked(()));
        }


        fn create_feature(
            ref self: ContractState,
            name: ByteArray,
            description: ByteArray,
            category: ByteArray,
            image_url: ByteArray,
            min_age: u256,
            price: u64,
            coin_type: ContractAddress,
        ) {
            let feature_id = self.feature_counter.read();
            let feature = Feature {
                creator: get_caller_address(),
                name,
                description,
                category,
                image_url,
                min_age,
                price,
                created_at: get_block_timestamp(),
                is_active: true,
                coin_type: coin_type,
            };
            self.features.entry(feature_id).write(feature);
            self.feature_vote_tallies.entry(feature_id).write(VoteTally { up: 0, down: 0 });
            self.feature_balances.entry(feature_id).write(0);
            self.feature_counter.write(feature_id + 1);

            self
                .emit(
                    Event::FeatureCreated(
                        FeatureCreatedEvent { feature_id, creator: get_caller_address() },
                    ),
                );
        }


        fn access_private_feature(
            ref self: ContractState,
            feature_id: u64,
            full_proof_with_hints: Span<felt252>,
            token_contract: ContractAddress,
        ) {
            let caller = get_caller_address();
            let user_access = self.user_feature_access.entry((caller, feature_id));
            assert(!user_access.read(), 'Invalid proof');
            let (is_valid, public_inputs) = verify_honk_proof(full_proof_with_hints);
            assert(is_valid, 'Invalid proof');

            let feature = self.features.entry(feature_id).read();
            assert(feature.is_active, 'Feature inactive');

            let cert_hash = *public_inputs.at(0);
            let min_age_feature = *public_inputs.at(1);

            match self.registered_hashes.entry(cert_hash).read() {
                Status::Verified(()) => {},
                _ => { assert(false, 'Cert not verified'); },
            }
            assert(min_age_feature >= feature.min_age, 'Age verification failed');
            user_access.write(true);

            if feature.price > 0 {
                let erc20 = IERC20Dispatcher { contract_address: token_contract };
                let success = erc20
                    .transfer_from(get_caller_address(), get_contract_address(), feature.price);
                assert(success, 'Payment failed');
                // let current_balance = self.feature_balances.entry(feature_id).read();
            // self
            //     .feature_balances
            //     .entry(feature_id)
            //     .write(current_balance + feature.price.into());

                // let current_tvl = self.protocol_tvl.entry(feature.coin_type).read();
            // self
            //     .protocol_tvl
            //     .entry(feature.coin_type)
            //     .write(current_tvl + feature.price.into());
            }
            // self.access_nullifiers.write(access_nullifier, true);
        // self
        //     .emit(
        //         Event::FeatureAccessed(
        //             FeatureAccessedEvent { feature_id, caller: get_caller_address() },
        //         ),
        //     );
        }


        fn vote_on_feature(
            ref self: ContractState,
            feature_id: u64,
            like: bool,
            full_proof_with_hints: Span<felt252>,
        ) {
            let (is_valid, public_inputs) = verify_honk_proof(full_proof_with_hints);
            assert(is_valid, 'Invalid proof');
            let feature = self.features.entry(feature_id).read();

            let cert_hash = *public_inputs.at(0);
            let min_age_feature = *public_inputs.at(1);

            assert(min_age_feature >= feature.min_age, 'Age verification failed');

            match self.registered_hashes.entry(cert_hash).read() {
                Status::Verified(()) => {},
                _ => { assert(false, 'Cert not verified'); },
            }

            let mut tally = self.feature_vote_tallies.entry(feature_id).read();
            if like {
                tally.up += 1;
            } else {
                tally.down += 1;
            }
            self.feature_vote_tallies.entry(feature_id).write(tally);

            self
                .emit(
                    Event::FeatureVoted(
                        FeatureVotedEvent { feature_id, vote: like, caller: get_caller_address() },
                    ),
                );
        }


        fn withdraw_funds(
            ref self: ContractState, feature_id: u64, token_contract: ContractAddress,
        ) {
            let feature = self.features.entry(feature_id).read();
            assert(feature.creator == get_caller_address(), 'Only creator');

            let balance: u128 = self.feature_balances.entry(feature_id).read();
            assert(balance > 0, 'No balance');

            let amount: u256 = u256 { low: balance.into(), high: 0 };
            let erc20 = IERC20Dispatcher { contract_address: token_contract };
            let success = erc20.transfer(feature.creator, amount);
            assert(success, 'Withdraw failed');

            self.feature_balances.entry(feature_id).write(0);
        }


        fn is_certificate_verified(self: @ContractState, cert_hash: u256) -> bool {
            match self.registered_hashes.entry(cert_hash).read() {
                Status::Verified(()) => true,
                _ => false,
            }
        }


        fn get_feature_votes(self: @ContractState, feature_id: u64) -> VoteTally {
            self.feature_vote_tallies.entry(feature_id).read()
        }


        fn get_feature_info(self: @ContractState, feature_id: u64) -> Feature {
            self.features.entry(feature_id).read()
        }


        fn get_owner_certificate(self: @ContractState, owner: ContractAddress) -> u256 {
            self.certificate_owners.entry(owner).read()
        }
    }
}
