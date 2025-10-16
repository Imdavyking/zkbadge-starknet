import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import type { JsonCertificate } from "../../lib/utils";
import {
  useAccount,
  useContract,
  useSendTransaction,
} from "@starknet-react/core";
import { CONTRACT_ADDRESS } from "../../utils/constants";
import abi from "../../assets/json/abi.json";
import { Noir } from "@noir-lang/noir_js";
import { UltraHonkBackend } from "@aztec/bb.js";
import { flattenFieldsAsArray } from "../../helpers/proof";
import { getHonkCallData, init } from "garaga";
import { bytecode, abi as circuitAbi } from "../../assets/circuit.json";
import vkUrl from "../../assets/vk.bin?url";
import { RpcProvider, Contract } from "starknet";
import initNoirC from "@noir-lang/noirc_abi";
import initACVM from "@noir-lang/acvm_js";
import acvm from "@noir-lang/acvm_js/web/acvm_js_bg.wasm?url";
import noirc from "@noir-lang/noirc_abi/web/noirc_abi_wasm_bg.wasm?url";
import { ProofState, type ProofStateData } from "../../types";

const VerifyBadge = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [certJson, setCertJson] = useState<JsonCertificate | null>(null);
  const [proofState, setProofState] = useState<ProofStateData>({
    state: ProofState.Initial,
  });
  const currentStateRef = useRef<ProofState>(ProofState.Initial);
  const [vk, setVk] = useState<Uint8Array | null>(null);

  useEffect(() => {
    const initWasm = async () => {
      try {
        // This might have already been initialized in main.tsx,
        // but we're adding it here as a fallback
        if (typeof window !== "undefined") {
          await Promise.all([initACVM(fetch(acvm)), initNoirC(fetch(noirc))]);
          console.log("WASM initialization in App component complete");
        }
      } catch (error) {
        console.error("Failed to initialize WASM in App component:", error);
      }
    };

    const loadVk = async () => {
      const response = await fetch(vkUrl);
      const arrayBuffer = await response.arrayBuffer();
      const binaryData = new Uint8Array(arrayBuffer);
      setVk(binaryData);
      console.log("Loaded verifying key:", binaryData);
    };

    initWasm();
    loadVk();
  }, []);

  // Handle user uploading JSON file
  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const json = JSON.parse(text);
      setCertJson(json);
      setStatus("✅ Certificate file loaded. Click verify to continue.");
      setError("");
    } catch (err) {
      console.error(err);
      setError("Invalid JSON file. Please upload the correct certificate.");
    }
  };

  const updateState = (newState: ProofState) => {
    currentStateRef.current = newState;
    setProofState({ state: newState, error: undefined });
  };

  const handleVerifying = async () => {
    if (!certJson) {
      setError("Please upload your certificate JSON first.");
      return;
    }

    setLoading(true);
    setError("");
    setStatus("");

    try {
      // // const { contract } = useContract({
      // //   abi,
      // //   address: CONTRACT_ADDRESS,
      // // });
      // updateState(ProofState.GeneratingWitness);
      // // Use input values from state
      // const input = { x: inputX, y: inputY };
      // // Generate witness
      // let noir = new Noir({ bytecode, abi: abi as any });
      // let execResult = await noir.execute(input);
      // console.log(execResult);
      // // Generate proof
      // updateState(ProofState.GeneratingProof);
      // let honk = new UltraHonkBackend(bytecode, { threads: 2 });
      // let proof = await honk.generateProof(execResult.witness, {
      //   starknet: true,
      // });
      // honk.destroy();
      // console.log(proof);
      // await init();
      // const callData = getHonkCallData(
      //   proof.proof,
      //   flattenFieldsAsArray(proof.publicInputs),
      //   vk as Uint8Array,
      //   1 // HonkFlavor.STARKNET
      // );
      // const provider = new RpcProvider({
      //   nodeUrl: "http://127.0.0.1:5050/rpc",
      // });
      // const contractAddress =
      //   "0x02b76ac09aea8957666f0fb3409b091e2bdca99700273af44358bd2ed0e14a32";
      // // const verifierContract = new Contract(
      // //   verifierAbi,
      // //   contractAddress,
      // //   provider
      // // );
      // // // Check verification
      // // const res = await verifierContract.verify_ultra_starknet_honk_proof(
      // //   callData.slice(1)
      // // );
    } catch (err: any) {
      console.error(err);
      setError("❌ Verification failed. " + (err?.message ?? ""));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-16 px-6 text-center">
      <h1 className="text-3xl font-bold mb-4">Verify Certificate</h1>
      <p className="text-gray-600 mb-6">
        Upload the JSON file you downloaded when registering your badge. We'll
        check if it's been verified.
      </p>

      {/* Upload JSON file */}
      <input
        type="file"
        accept="application/json"
        onChange={handleFileUpload}
        className="mb-4 block w-full text-sm text-gray-700 border border-gray-300 rounded-lg p-2"
      />

      <button
        onClick={handleVerifying}
        disabled={loading || !certJson}
        className="bg-indigo-700 text-white px-6 py-3 rounded-full font-semibold hover:bg-indigo-800 transition disabled:opacity-50"
      >
        {loading ? "Verifying..." : "Verify Badge"}
      </button>

      {status && <p className="mt-4 text-green-600 font-medium">{status}</p>}
      {error && <p className="mt-4 text-red-600 font-medium">{error}</p>}
    </div>
  );
};

export default VerifyBadge;
