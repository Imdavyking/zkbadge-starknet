// pub mod honk_verifier;
// mod honk_verifier_circuits;
// mod honk_verifier_constants;
#[starknet::interface]
trait IERC20<TContractState> {
    fn transfer_from(
        ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256,
    ) -> bool;
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
}

#[starknet::contract]
mod AgeGatedFeaturesContract {
    // ERC20 interface for payments
    use core::array::ArrayTrait; // For dynamic arrays.
    use core::circuit::u384; // For u384 arithmetic, used in hashing.
    use core::num::traits::Zero; // For checking if a value is zero.
    use garaga::hashes::poseidon_hash_2_bn254; // Poseidon hash function for cryptographic commitments.
    use starknet::event::EventEmitter; // For emitting events.
    use starknet::storage::Map;
    use starknet::storage::{ // For persistent storage.
        Map, MutableVecTrait, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
        VecTrait,
    };
    use starknet::{
        ContractAddress, SyscallResultTrait, get_block_timestamp, get_caller_address,
        get_contract_address, syscalls,
    };


    // Enums
    #[derive(Copy, Drop, Serde, starknet::Store)]
    #[allow(starknet::store_no_default_variant)]
    enum Status {
        Pending: (),
        Verified: (),
        Revoked: (),
    }

    // Only store what the contract needs to know
    #[derive(Drop, Serde, starknet::Store)]
    struct Feature {
        creator: ContractAddress,
        name: ByteArray,
        description: ByteArray,
        category: ByteArray,
        image_url: ByteArray,
        min_age: u16,
        price: u64,
        created_at: u64,
        is_active: bool,
        coin_type: felt252 // Token contract address or identifier
    }

    #[derive(Copy, Drop, Serde, starknet::Store)]
    struct VoteTally {
        up: u64,
        down: u64,
    }

    #[storage]
    struct Storage {
        admin: ContractAddress,
        feature_balances: Map<u64, u128>,
        trusted_issuers: Map<ContractAddress, bool>,
        registered_hashes: Map<felt252, Status>,
        protocol_tvl: Map<felt252, u128>,
        certificate_owners: Map<ContractAddress, felt252>,
        features: Map<u64, Feature>,
        feature_counter: u64,
        access_nullifiers: Map<felt252, bool>,
        vote_nullifiers: Map<felt252, bool>,
        feature_vote_tallies: Map<u64, VoteTally>,
        verified_users: Map<ContractAddress, bool>,
    }

    #[constructor]
    fn constructor(ref self: ContractState) { // self.admin.write(get_caller_address());
    // self.feature_counter.write(0);
    }
    // Direct verifier call (assuming verifier functions are in scope)
    fn verify_honk_proof(full_proof_with_hints: Span<felt252>) -> (bool, Span<u256>) {
        let mut result = syscalls::library_call_syscall(
            VERIFIER_CLASSHASH.try_into().unwrap(),
            selector!("verify_ultra_starknet_honk_proof"),
            full_proof_with_hints,
        )
            .unwrap_syscall();
        // let public_inputs = Serde::<Option<Span<u256>>>::deserialize(ref result)
        //     .unwrap()
        //     .expect('Proof is invalid');
        // let solution_hash = *public_inputs.at(4);
        (true, result)
    }
    // // Helper to extract public inputs safely
// fn extract_public_inputs(
//     public_inputs: Span<u256>, expected_len: usize, index: usize,
// ) -> felt252 {
//     assert(public_inputs.len() >= expected_len, 'Invalid public inputs len');
//     let u256_val = *public_inputs.at(index);
//     assert(u256_val.high == 0, 'u256 too large for felt252');
//     u256_val.low
// }

    // // Admin functions
// #[external(v0)]
// fn add_trusted_issuer(ref self: ContractState, issuer: ContractAddress) {
//     assert(get_caller_address() == self.admin.read(), 'Only admin');
//     self.trusted_issuers.write(issuer, true);
// }

    // #[external(v0)]
// fn remove_trusted_issuer(ref self: ContractState, issuer: ContractAddress) {
//     assert(get_caller_address() == self.admin.read(), 'Only admin');
//     self.trusted_issuers.write(issuer, false);
// }

    // // Register certificate via ZK proof
// #[external(v0)]
// fn register(ref self: ContractState, full_proof_with_hints: Span<felt252>) {
//     let (is_valid, public_inputs) = verify_honk_proof(full_proof_with_hints);
//     assert(is_valid, 'Invalid proof');

    //     let cert_hash = extract_public_inputs(public_inputs, 1, 0);
//     let caller = get_caller_address();

    //     let current_status = self.registered_hashes.read(cert_hash);
//     match current_status {
//         Status::Pending(()) => {},
//         Status::Verified(()) => { assert(false, 'Already verified'); },
//         Status::Revoked(()) => { assert(false, 'Certificate revoked'); },
//     }

    //     self.registered_hashes.write(cert_hash, Status::Verified(()));
//     self.certificate_owners.write(caller, cert_hash);
//     self.verified_users.write(caller, true);
// }

    // // Batch verify certificates (admin only)
// #[external(v0)]
// fn verify_certificates(ref self: ContractState, hashes: Array<felt252>) {
//     assert(get_caller_address() == self.admin.read(), 'Only admin');

    //     let mut i: usize = 0;
//     loop {
//         if i == hashes.len() {
//             break;
//         }
//         let hash = *hashes.at(i);
//         self.registered_hashes.write(hash, Status::Verified(()));
//         i += 1;
//     };
// }

    // #[external(v0)]
// fn revoke_certificate(ref self: ContractState, cert_hash: felt252) {
//     assert(get_caller_address() == self.admin.read(), 'Only admin');
//     self.registered_hashes.write(cert_hash, Status::Revoked(()));
// }

    // // Check certificate verification
// #[view]
// fn is_certificate_verified(self: @ContractState, cert_hash: felt252) -> bool {
//     self.registered_hashes.read(cert_hash) == Status::Verified(())
// }

    // // Create feature
// #[external(v0)]
// fn create_feature(
//     ref self: ContractState,
//     name: ByteArray,
//     description: ByteArray,
//     category: ByteArray,
//     image_url: ByteArray,
//     min_age: u16,
//     price: u64,
//     coin_type: ContractAddress,
// ) {
//     let feature_id = self.feature_counter.read();
//     let feature = Feature {
//         creator: get_caller_address(),
//         name,
//         description,
//         category,
//         image_url,
//         min_age,
//         price,
//         created_at: get_block_timestamp(),
//         is_active: true,
//         coin_type: coin_type.into(),
//     };
//     self.features.write(feature_id, feature);
//     self.feature_vote_tallies.write(feature_id, VoteTally { up: 0, down: 0 });
//     self.feature_balances.write(feature_id, 0);
//     self.feature_counter.write(feature_id + 1);
// }

    // // Access feature with ZK proof
// #[external(v0)]
// fn access_private_feature(
//     ref self: ContractState,
//     feature_id: u64,
//     full_proof_with_hints: Span<felt252>,
//     token_contract: ContractAddress,
// ) {
//     let (is_valid, public_inputs) = verify_honk_proof(full_proof_with_hints);
//     assert(is_valid, 'Invalid proof');

    //     // Extract: cert_hash, access_nullifier, age_ok_flag
//     let cert_hash = extract_public_inputs(public_inputs, 3, 0);
//     let access_nullifier = extract_public_inputs(public_inputs, 3, 1);
//     let age_ok_flag = extract_public_inputs(public_inputs, 3, 2);

    //     assert(self.registered_hashes.read(cert_hash) == Status::Verified(()), 'Cert not
//     verified');
//     assert(age_ok_flag == 1, 'Age verification failed');
//     assert(!self.access_nullifiers.read(access_nullifier), 'Already accessed');

    //     let feature = self.features.read(feature_id);
//     assert(feature.is_active, 'Feature inactive');

    //     // Handle payment
//     if feature.price > 0 {
//         let payment_amount = u256 { low: feature.price.into(), high: 0 };
//         let erc20 = IERC20Dispatcher { contract_address: token_contract };
//         let success = erc20
//             .transfer_from(get_caller_address(), get_contract_address(), payment_amount);
//         assert(success, 'Payment failed');

    //         let current_balance = self.feature_balances.read(feature_id);
//         self.feature_balances.write(feature_id, current_balance + feature.price.into());

    //         let current_tvl = self.protocol_tvl.read(feature.coin_type);
//         self.protocol_tvl.write(feature.coin_type, current_tvl + feature.price.into());
//     }

    //     self.access_nullifiers.write(access_nullifier, true);
// }
// Vote with ZK proof
//     #[external(v0)]
//     fn vote_on_feature(
//         ref self: ContractState,
//         feature_id: u64,
//         like: bool,
//         full_proof_with_hints: Span<felt252>,
//     ) {
//         let (is_valid, public_inputs) = verify_honk_proof(full_proof_with_hints);
//         assert(is_valid, 'Invalid proof');

    //         // Extract: cert_hash, access_nullifier, vote_nullifier
//         let cert_hash = extract_public_inputs(public_inputs, 3, 0);
//         let access_nullifier = extract_public_inputs(public_inputs, 3, 1);
//         let vote_nullifier = extract_public_inputs(public_inputs, 3, 2);

    //         assert(self.registered_hashes.read(cert_hash) == Status::Verified(()), 'Cert not
//         verified');
//         assert(self.access_nullifiers.read(access_nullifier), 'Must access first');
//         assert(!self.vote_nullifiers.read(vote_nullifier), 'Already voted');

    //         self.vote_nullifiers.write(vote_nullifier, true);

    //         let mut tally = self.feature_vote_tallies.read(feature_id);
//         if like {
//             tally.up += 1;
//         } else {
//             tally.down += 1;
//         }
//         self.feature_vote_tallies.write(feature_id, tally);
//     }

    //     // Withdraw funds
//     #[external(v0)]
//     fn withdraw_funds(ref self: ContractState, feature_id: u64, token_contract:
//     ContractAddress) {
//         let feature = self.features.read(feature_id);
//         assert(feature.creator == get_caller_address(), 'Only creator');

    //         let balance: u128 = self.feature_balances.read(feature_id);
//         assert(balance > 0, 'No balance');

    //         let amount: u256 = u256 { low: balance.into(), high: 0 };
//         let erc20 = IERC20Dispatcher { contract_address: token_contract };
//         let success = erc20.transfer(feature.creator, amount);
//         assert(success, 'Withdraw failed');

    //         self.feature_balances.write(feature_id, 0);
//     }

    //     // View functions
//     #[view]
//     fn get_feature_votes(self: @ContractState, feature_id: u64) -> VoteTally {
//         self.feature_vote_tallies.read(feature_id)
//     }

    //     #[view]
//     fn get_feature_info(self: @ContractState, feature_id: u64) -> Feature {
//         self.features.read(feature_id)
//     }

    //     #[view]
//     fn get_owner_certificate(self: @ContractState, owner: ContractAddress) -> felt252 {
//         self.certificate_owners.read(owner)
//     }
// }

    // // Your verifier module (in same file)
// mod verifier {
//     use array::ArrayTrait;

    //     // Assuming this is your verifier implementation
//     pub fn verify_ultra_starknet_honk_proof(
//         full_proof_with_hints: Span<felt252>,
//     ) -> Option<Span<u256>> {
//         // Your verifier logic here
//         // This should return Some(public_inputs) if valid, None if invalid

    //         // Example placeholder:
//         // let proof_data = full_proof_with_hints.slice(0..proof_size);
//         // let public_inputs = verify_proof_internal(proof_data);
//         // if valid { return Option::Some(public_inputs); } else { Option::None }

    //         Option::None // Replace with actual implementation
//     }
}
