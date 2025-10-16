import { useEffect, useState } from "react";
import { Noir, type CompiledCircuit } from "@noir-lang/noir_js";
import { UltraHonkBackend } from "@aztec/bb.js";
import { getHonkCallData, init as initGaraga } from "garaga";
import { flattenFieldsAsArray } from "../helpers/proof";
import initNoirC from "@noir-lang/noirc_abi";
import initACVM from "@noir-lang/acvm_js";
import acvm from "@noir-lang/acvm_js/web/acvm_js_bg.wasm?url";
import noirc from "@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm?url";
import circuit from "../assets/circuit.json";
import vkUrl from "../assets/vk.bin?url";

export function useZkVerifier() {
  const [vk, setVk] = useState<Uint8Array | null>(null);

  /** Initialize Noir and WASM once */
  useEffect(() => {
    const initWasm = async () => {
      try {
        await Promise.all([initACVM(fetch(acvm)), initNoirC(fetch(noirc))]);

        console.log("✅ Noir initialized");
      } catch (err) {
        console.error("Failed to initialize Noir/ACVM:", err);
      }
    };

    const loadVk = async () => {
      const response = await fetch(vkUrl);
      const buffer = await response.arrayBuffer();
      setVk(new Uint8Array(buffer));
      console.log("✅ Verifying key loaded");
    };

    initWasm();
    loadVk();
  }, []);

  /** Generate proof */
  const generateProof = async (input: Record<string, any>) => {
    if (!vk) throw new Error("Verifier not initialized yet");

    let noir = new Noir(circuit as CompiledCircuit);

    console.log("🧮 Generating witness...");
    const execResult = await noir.execute(input);

    console.log("🔒 Generating proof...");
    const honk = new UltraHonkBackend(circuit.bytecode, { threads: 2 });

    const proof = await honk.generateProof(execResult.witness, {
      starknet: true,
    });
    honk.destroy();

    console.log("🧩 Preparing callData...");
    await initGaraga();
    const callData = getHonkCallData(
      proof.proof,
      flattenFieldsAsArray(proof.publicInputs),
      vk,
      1 // HonkFlavor.STARKNET
    );

    return { proof, callData };
  };

  return { generateProof };
}
