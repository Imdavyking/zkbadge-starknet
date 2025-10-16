import { poseidon2 } from "poseidon-lite";

const issuer = "0x6789abcdef123678fc58b79b6be4567";
const issued_at = 1697059200;
const valid_until = 1735689600;
const is_valid = true;
const owner = "0x057524576a4cec4a2fc58b79b6be09de";
const year_of_birth = 1990;

const hash = poseidon2([issuer]);

console.log(hash);
