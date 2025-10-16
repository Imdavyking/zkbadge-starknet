import { poseidon2 } from "poseidon-lite";
import { poseidon2Hash } from "@zkpassport/poseidon2";

const issuer = BigInt("0x6789abcdef123678fc58b79b6be4567");
const issued_at = 1697059200n;
const valid_until = 1735689600n;
const is_valid = 1n;
const owner = BigInt("0x057524576a4cec4a2fc58b79b6be09de");
const year_of_birth = 1990n;

const fields = [issuer, issued_at, valid_until, is_valid, owner, year_of_birth];

// Chain poseidon2 hashes just like in Cairo
let hash = poseidon2Hash(fields);
console.log("0x" + hash.toString(16));
