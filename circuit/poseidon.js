import { poseidon2 } from "poseidon-lite";

const issuer = "0x6789abcdef123678fc58b79b6be4567";
const issued_at = 1697059200;
const valid_until = 1735689600;
const is_valid = 1;
const owner = "0x057524576a4cec4a2fc58b79b6be09de";
const year_of_birth = 1990;

const fields = [issuer, issued_at, valid_until, is_valid, owner, year_of_birth];

// Chain poseidon2 hashes just like in Cairo
let acc = poseidon2([fields[0], fields[1]]);
for (let i = 2; i < fields.length; i++) {
  acc = poseidon2([acc, fields[i]]);
}

console.log("0x" + acc.toString(16));
