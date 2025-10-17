import { ellipsify } from "../../utils/ellipsify";
import type { FeatureJson } from "./main";
import { CONTRACT_ADDRESS, NATIVE_TOKEN } from "../../utils/constants";
import { useEffect, useState } from "react";
import { FaSpinner } from "react-icons/fa";
import { toast } from "react-toastify";
import erc20Abi from "../../assets/json/erc20";
import abi from "../../assets/json/abi";
import type { ZkProofInput } from "@/lib/common-types";
import {
  useAccount,
  useContract,
  useSendTransaction,
} from "@starknet-react/core";
import { useZkVerifier } from "../../helpers/gen_proof";

export const Feature = (feature: FeatureJson) => {
  const [isLiking, setIsLiking] = useState(false);
  const [isDisliking, setIsDisliking] = useState(false);
  const [isAccessing, setIsAccessing] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [certJson, setCertJson] = useState<ZkProofInput | null>(null);
  const [loading, setLoading] = useState(true);
  const [voteData, setVoteData] = useState<{ up: bigint; down: bigint } | null>(
    null
  );
  const { generateProof } = useZkVerifier();
  const [proof, setProof] = useState<bigint[]>([]);
  const { address, account } = useAccount();

  const { contract: erc20Contract } = useContract({
    abi: erc20Abi,
    address: NATIVE_TOKEN,
  });

  const { sendAsync: approveToken } = useSendTransaction({
    calls:
      erc20Contract && address
        ? [erc20Contract.populate("approve", [NATIVE_TOKEN, feature.price])]
        : undefined,
  });

  const { contract } = useContract({
    abi,
    address: CONTRACT_ADDRESS,
  });

  const { sendAsync: accessFeature } = useSendTransaction({
    calls:
      contract && address
        ? [
            contract.populate("access_private_feature", [
              BigInt(feature.id),
              proof,
              NATIVE_TOKEN,
            ]),
          ]
        : undefined,
  });

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

  const handleLike = async () => {
    try {
      setIsLiking(true);
    } catch (err: any) {
      toast.error(err?.message);
      setError(err?.message ?? String(err));
    } finally {
      setIsLiking(false);
    }
  };

  const handleDislike = async () => {
    try {
      setIsDisliking(true);

      console.log(`Disliked feature ${feature.id}`);
    } catch (err: any) {
      toast.error(err?.message);
      setError(err?.message ?? String(err));
    } finally {
      setIsDisliking(false);
    }
  };

  const handleAccess = async () => {
    try {
      setIsAccessing(true);
      if (!certJson) {
        toast.error("Upload your certificate");
        return;
      }

      const { callData: proofCallData } = await generateProof(certJson);
      const proofData = proofCallData.slice(1);
      console.log({ proofData });
      setProof(proofData);
      const transaction = await approveToken();

      if (transaction?.transaction_hash) {
        console.log("Transaction submitted:", transaction.transaction_hash);
      }
      await account?.waitForTransaction(transaction.transaction_hash);

      const tx2 = await accessFeature();
      if (tx2?.transaction_hash) {
        console.log("Transaction submitted:", tx2.transaction_hash);
      }
      await account?.waitForTransaction(tx2.transaction_hash);

      toast.success("Access created successfully");
    } catch (err: any) {
      toast.error(err?.message);
      setError(err?.message ?? String(err));
    } finally {
      setIsAccessing(false);
    }
  };

  return (
    <div
      key={feature.id}
      className="bg-white shadow-md rounded-2xl p-4 hover:shadow-lg transition"
    >
      <img
        src={feature.image_url}
        alt={feature.name}
        className="w-full h-40 object-cover rounded-xl mb-4"
      />

      <h2 className="text-xl font-semibold text-gray-800 mb-2">
        {feature.name}
      </h2>
      <p className="text-gray-600 mb-3">{feature.description}</p>

      <div className="flex flex-wrap text-sm text-gray-500 mb-3">
        <span className="mr-3">📂 {feature.category}</span>
        <span className="mr-3">🔞 {feature.min_age}+</span>
        <span className="mr-3">
          💰{" "}
          {feature.price > 0
            ? `${feature.price / 10 ** 18} ${
                NATIVE_TOKEN == feature.coin_type ? "STRK" : "Unknown Token"
              }`
            : "Free"}
        </span>
      </div>

      <div className="flex justify-between items-center text-xs text-gray-400">
        <span>By {ellipsify(`0x${BigInt(feature.creator).toString(16)}`)}</span>
        <span>{new Date(feature.created_at).toLocaleDateString()}</span>
      </div>

      <div className="mt-3">
        {feature.is_active ? (
          <span className="text-green-600 font-medium">Active</span>
        ) : (
          <span className="text-red-600 font-medium">Inactive</span>
        )}
      </div>

      <p className="text-gray-600 mb-6">
        Upload the JSON file you downloaded when registering your badge. We'll
        use it to vote and access this feature without disclosing your details
      </p>

      {status && <p className="mt-4 text-green-600 font-medium">{status}</p>}
      {error && <p className="mt-4 text-red-600 font-medium">{error}</p>}

      {/* Upload JSON file */}
      <input
        type="file"
        accept="application/json"
        onChange={handleFileUpload}
        className="mb-4 block w-full text-sm text-gray-700 border border-gray-300 rounded-lg p-2"
      />

      {/* Action Buttons */}
      <div className="mt-4 flex justify-between gap-3">
        <button
          onClick={handleLike}
          disabled={isLiking}
          className="flex-1 bg-green-50 text-green-600 border border-green-200 px-3 py-2 rounded-xl text-sm font-medium hover:bg-green-100 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isLiking ? (
            <FaSpinner className="animate-spin mr-2" />
          ) : (
            ` 👍 Like ${voteData?.up}`
          )}
        </button>

        <button
          onClick={handleDislike}
          disabled={isDisliking}
          className="flex-1 bg-red-50 text-red-600 border border-red-200 px-3 py-2 rounded-xl text-sm font-medium hover:bg-red-100 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isDisliking ? (
            <FaSpinner className="animate-spin mr-2" />
          ) : (
            `👎 Dislike ${voteData?.down}`
          )}
        </button>

        <button
          onClick={handleAccess}
          disabled={isAccessing}
          className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isAccessing ? (
            <FaSpinner className="animate-spin mr-2" />
          ) : (
            "🔑 Access"
          )}
        </button>
      </div>
    </div>
  );
};
