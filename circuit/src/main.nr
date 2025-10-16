use dep::poseidon::poseidon2;
use dep::std;

struct Certificate {
    issuer: [u8; 32],
    issued_at: u64,
    valid_until: u64,
    is_valid: bool,
    owner: [u8; 32],
    year_of_birth: u16,
}

// Helper to convert [u8; 32] to Field for hashing
fn bytes32_to_field(bytes: [u8; 32]) -> Field {
    let mut result = 0;
    for i in 0..32 {
        result = result * 256 + (bytes[i] as Field);
    }
    result
}

// Convert certificate to Field array for Poseidon2 hashing
fn cert_to_fields(cert: Certificate) -> [Field; 6] {
    [
        bytes32_to_field(cert.issuer),
        cert.issued_at as Field,
        cert.valid_until as Field,
        if cert.is_valid { 1 } else { 0 } as Field,
        bytes32_to_field(cert.owner),
        cert.year_of_birth as Field,
    ]
}

// Hash certificate using Poseidon2
fn cert_hash(cert: Certificate) -> Field {
    let fields = cert_to_fields(cert);
    poseidon2::Poseidon2::hash(fields, fields.len())
}

// Create certificate
fn user_certificate(
    issuer: [u8; 32],
    issued_at: u64,
    valid_until: u64,
    is_valid: bool,
    owner: [u8; 32],
    year_of_birth: u16,
) -> Certificate {
    Certificate { issuer, issued_at, valid_until, is_valid, owner, year_of_birth }
}

// Verify certificate signature and freshness using Poseidon2 hash
fn prove_cert_signed_and_fresh(cert: Certificate, now: u64, caller_pub: [u8; 32]) -> bool {
    let msg_hash = cert_hash(cert);

    // Verify ownership
    assert(cert.owner == caller_pub);
    assert(cert.is_valid);
    assert(now < cert.valid_until);

    // Signature verification would use msg_hash as the message digest
    // Poseidon2 hash is directly usable as Field element for signature verification

    true
}

// Check age requirement for feature
fn check_age_feature(cert: Certificate, feature_age: u16, current_year: u16) -> bool {
    let age = current_year - cert.year_of_birth;
    age >= feature_age
}

// Generate access nullifier using Poseidon2
fn gen_access_nullifier(cert: Certificate, secret: Field) -> Field {
    let cert_hash_field = cert_hash(cert);

    let inputs = [cert_hash_field, secret];
    poseidon2::Poseidon2::hash(inputs, inputs.len())
}

// Poseidon2 hash of certificate for public verification
fn cert_poseidon_hash(cert: Certificate) -> Field {
    cert_hash(cert)
}

fn main(
    // Private witnesses
    issuer: [u8; 32],
    issued_at: u64,
    valid_until: u64,
    is_valid: bool,
    year_of_birth: u16,
    secret: Field,
    // Public inputs
    hash: pub Field,
    min_age_feature: pub u16,
    access_nullifier: pub Field,
    now: pub u64,
    caller: pub [u8; 32],
    current_year: pub u16,
) {
    let cert = user_certificate(
        issuer,
        issued_at,
        valid_until,
        is_valid,
        caller,
        year_of_birth,
    );

    // Verify certificate freshness and ownership
    let proof_ok = prove_cert_signed_and_fresh(cert, now, caller);
    assert(proof_ok, "certificate invalid");

    // Verify certificate Poseidon2 hash matches public input
    let computed_hash = cert_poseidon_hash(cert);
    assert(computed_hash == hash, "hash doesn't match certificate");

    // // Example: check age for a feature requiring 18+

    let age_ok = check_age_feature(cert, min_age_feature, current_year);
    assert(age_ok, "user can not access this");

    assert(access_nullifier == gen_access_nullifier(cert, secret), "nullifier not correct");
}
