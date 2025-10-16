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

const issuer = "0x6789abcdef123678fc58b79b6be4567";
const issued_at = 1697059200;
const valid_until = 1735689600;
const is_valid = true;
const owner = "0x057524576a4cec4a2fc58b79b6be09de";
const year_of_birth = 1990;

const hash = poseidon2([issuer]);

console.log(hash);
