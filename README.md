# ZkBadge

**Privacy-Preserving Age-Gated Content & Features with Zero-Knowledge Proofs on Starknet**

ZkBadge enables creators to publish age-restricted content and features while users prove eligibility using zero-knowledge proofs without revealing personal information. Built with Starknet's native Honk ZK system.

[![Starknet](https://img.shields.io/badge/Starknet-Eth%20Cairo-blue)](https://www.starknet.io/)
[![Zero Knowledge](https://img.shields.io/badge/Zero--Knowledge-Privacy%20First-green)](https://en.wikipedia.org/wiki/Zero-knowledge_proof)
[![Rust Cairo](https://img.shields.io/badge/Cairo-Rust%20Contracts-orange)](https://www.cairo-lang.org/)

## 🚀 Features

- **ZK Age Verification**: Prove age eligibility without revealing birth date
- **Privacy-Preserving Access**: Nullifier-based double-spend protection
- **Multi-Token Payments**: ERC20 payments for feature access
- **Creator Marketplace**: Monetize age-gated content and services
- **Community Voting**: Verified users rate features
- **Honk Proof Integration**: Native Starknet UltraHonk verification
- **Certificate Revocation**: Admin-controlled certificate management

## 🏗️ Architecture

### Core Components

1. **ZK Certificate System**

   - Poseidon2 hashed certificates (issuer, birth year, validity)
   - Trusted issuer registry with admin controls
   - Revocable certificates with status tracking

2. **Feature Marketplace**

   - Age-gated paid/private features
   - Creator ownership and fund withdrawal
   - Multi-token payment support

3. **ZK Verification Circuit** (Noir)

   - Certificate validity and freshness
   - Age requirement verification
   - Nullifier uniqueness for replay protection
   - Public inputs: hash, min_age, nullifier, timestamp

4. **On-Chain Verifier**
   - UltraStarknetHonk proof verification
   - Gas-optimized native Starknet integration
   - Generated via Garaga tooling

## 📋 Prerequisites

- Git, Make, curl, bash
- Python/pip for Garaga
- [asdf](https://asdf-vm.com/) version manager

# Usage

Deploy:

```
scarb build
yarn deploy
```

## Testing

```
scarb test
```

## 🛠️ Installation & Setup

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Imdavyking/zkbadge-starknet
cd zkbadge
make install-bun install-noir install-barretenberg install-starknet install-devnet install-garaga install-app-deps
```

### 2. Start Development Environment

```bash
# Terminal 1: Start Starknet Devnet
make devnet

# Terminal 2: Get account details
make accounts-file
```

### 3. Build ZK Circuit & Proof System

```bash
make build-circuit exec-circuit prove-circuit gen-vk
```

### 4. Generate & Deploy Verifier

```bash
make gen-verifier build-verifier declare-verifier
# Update class hash in Makefile, then:
make deploy-verifier
```

### 5. Copy Artifacts & Run App

```bash
make artifacts
make run-app
```

## 🔄 Development Workflow

### Full Build Pipeline

```bash
# Start devnet
make devnet

# Build ZK pipeline
make build-circuit exec-circuit prove-circuit gen-vk gen-verifier build-verifier declare-verifier deploy-verifier artifacts

# Run frontend
make run-app
```

### Key Makefile Targets

| Target            | Description                           |
| ----------------- | ------------------------------------- |
| `devnet`          | Start Starknet devnet with 2 accounts |
| `build-circuit`   | Compile Noir ZK circuit               |
| `prove-circuit`   | Generate UltraHonk proof              |
| `gen-verifier`    | Generate Starknet verifier contract   |
| `deploy-verifier` | Deploy verifier to devnet             |
| `run-app`         | Start Bun dev server                  |

## 🔐 Certificate & Proof Flow

### 1. Certificate Creation (Off-chain)

```rust
// Certificate contains private data
let cert = Certificate {
    issuer: issuer_bytes,
    issued_at: timestamp,
    valid_until: expiration,
    is_valid: true,
    owner: user_address,
    year_of_birth: 1990, // Private
};

// Generate Poseidon2 hash for public commitment
let cert_hash = cert_hash(cert);
```

### 2. ZK Proof Generation

The Noir circuit proves:

- ✅ Certificate ownership matches caller
- ✅ Certificate is valid and not expired
- ✅ User meets minimum age requirement
- ✅ Nullifier prevents double-spending
- ✅ Hash matches public commitment

**Public Inputs:**

```rust
[ cert_hash, min_age_feature, access_nullifier, current_time ]
```

### 3. On-Chain Registration

```rust
// Submit Honk proof for certificate registration
zkbadge.register(full_proof_with_hints);
```

### 4. Feature Access

```rust
// Creators publish features
zkbadge.create_feature(
    name: "18+ Premium Content",
    min_age: 18u256,
    price: 10 * 10^6u256, // 10 USDC
    coin_type: usdc_address
);

// Users access with ZK proof + payment
zkbadge.access_private_feature(
    feature_id: 0,
    full_proof_with_hints: proof,
    token_contract: usdc_address
);
```

## 🛡️ Security Features

- **Global Nullifier Registry**: Prevents replay attacks across features
- **Per-User Access Tracking**: One-time access per user per feature
- **Certificate Revocation**: Admin can revoke compromised certificates
- **Trusted Issuers**: Only admin-approved issuers
- **ERC20 Payment Verification**: Atomic transfers with failure checks
- **Active Feature Validation**: Inactive features blocked

## 📁 Project Structure

```
zkbadge/
├── circuit/                 # Noir ZK circuits
│   ├── src/main.nr          # Age verification logic
│   └── Nargo.toml
├── contracts/               # Starknet contracts
│   ├── src/lib.cairo        # ZkBadgeImpl
│   ├── verifier/            # Generated verifier
│   └── Scarb.toml
├── app/                     # Frontend (Bun + TypeScript)
│   ├── src/assets/          # Proof artifacts
│   └── package.json
├── accounts.json            # Devnet accounts
└── Makefile                 # Development automation
```

## 🧪 Testing

### Circuit Tests

```bash
cd circuit && nargo test
```

### Contract Tests

```bash
cd contracts && scarb test
```

### E2E Testing

1. Start devnet: `make devnet`
2. Deploy contracts and verifier
3. Generate test proofs
4. Test full user flow via frontend

## 🔧 Troubleshooting

### Devnet Issues

```bash
# Kill existing processes
pkill -f starknet-devnet
make devnet
```

### Proof Generation Fails

- Verify witness exists: `./circuit/target/witness.gz`
- Check Noir version: `noirup --version`
- Ensure Barretenberg compatibility

### Verifier Deployment

- Update class hash from `declare-verifier` output
- Check account balance for gas fees
- Verify devnet connection

## 🚀 Production Deployment

1. **Replace Devnet**: Use testnet/mainnet RPC
2. **Update Verifier**: Set production class hash in main contract
3. **Configure Issuers**: Add trusted certificate issuers
4. **Test Payments**: Verify ERC20 integration
5. **Monitor**: Set up event logging and alerts

### Environment Variables

```bash
export STARKNET_RPC_URL=<your-rpc>
export ADMIN_PRIVATE_KEY=0x...
export VERIFIER_CLASSHASH=0x...
```

## 📈 Monitoring & Analytics

- **Events**: Certificate verification, feature access, voting
- **Metrics**: TVL per token, feature usage, vote tallies
- **Queries**: Feature info, certificate status, user access

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/zk-optimization`
3. Commit changes: `git commit -m "Add batch verification"`
4. Push: `git push origin feature/zk-optimization`
5. Open Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🙌 Community & Support

- **Starknet Discord**: Join Starknet developer community
- **Documentation**: [Starknet Docs](https://docs.starknet.io)
- **Issues**: Report bugs on GitHub
- **Twitter**: Follow @zkbadge_protocol

## 🚧 Roadmap

- [ ] Mainnet deployment
- [ ] Frontend SDK for proof generation
- [ ] Batch certificate verification
- [ ] Cross-chain support
- [ ] Mobile wallet integration
- [ ] Advanced analytics dashboard

---

**ZkBadge: Privacy-preserving age verification for Web3**

_Built with ❤️ for the decentralized future_
