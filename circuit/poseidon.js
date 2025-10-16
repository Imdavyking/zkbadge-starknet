import { poseidon2 } from "poseidon-lite";

const MODULUS =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

function bytes32ToField(bytes) {
  // Convert plain array to Uint8Array if needed
  const byteArray = Array.isArray(bytes) ? new Uint8Array(bytes) : bytes;

  // Ensure we have exactly 32 bytes (pad with zeros if needed)
  const paddedBytes = new Uint8Array(32).fill(0);
  const bytesToCopy = Math.min(byteArray.length, 32);
  paddedBytes.set(byteArray.slice(0, bytesToCopy), 32 - bytesToCopy);

  let result = 0n;
  for (let i = 0; i < 32; i++) {
    result = (result * 256n + BigInt(paddedBytes[i])) % MODULUS;
  }
  return result;
}

// Define all variables
const issuer = [
  0x01,
  0x23,
  0x45,
  0x67,
  0x89,
  0xab,
  0xcd,
  0xef,
  0x01,
  0x23,
  0x45,
  0x67,
  0x89,
  0xab,
  0xcd,
  0xef,
  0x01,
  0x23,
  0x45,
  0x67,
  0x89,
  0xab,
  0xcd,
  0xef,
  0x01,
  0x23,
  0x45,
  0x67,
  0x89,
  0xab,
  0xcd,
  0xef,
  0x00, // 32 bytes total
];

const issued_at = 1697059200;
const valid_until = 1735689600;
const is_valid = true;
const year_of_birth = 1990;
const secret = "0x27176fe12e4034d09b28fedd72ba97";

// Convert all to BigInt field elements
const issuerField = bytes32ToField(issuer);
const issuedAtField = BigInt(issued_at);
const validUntilField = BigInt(valid_until);
const isValidField = BigInt(is_valid ? 1 : 0);
const yearOfBirthField = BigInt(year_of_birth);

// Handle the secret: parse hex string and convert to field element
const secretHex = secret.slice(2); // Remove "0x" prefix
const secretBytes = Buffer.from(secretHex, "hex"); // This returns Buffer (Uint8Array subclass)
const secretField = bytes32ToField(secretBytes); // Buffer works with .set()

// Now compute the Poseidon hash with exactly 6 BigInt inputs
const hash = poseidon2([issuerField]);

console.log("Issuer field:", issuerField.toString());
console.log("Issued at:", issuedAtField.toString());
console.log("Valid until:", validUntilField.toString());
console.log("Is valid:", isValidField.toString());
console.log("Year of birth:", yearOfBirthField.toString());
console.log("Secret field:", secretField.toString());
console.log("Poseidon hash:", hash.toString());
console.log("Poseidon hash (hex):", "0x" + hash.toString(16));
