import { useState } from "react";
import { toast } from "react-toastify";
import { useReadContract } from "@starknet-react/core";
import { CONTRACT_ADDRESS } from "../../utils/constants";
import abi from "../../assets/json/abi";

import React from "react";
import { poseidon2Hash } from "@zkpassport/poseidon2";
import type { ZkProofInput } from "@/lib/common-types";

const VerifyBadge = () => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [certJson, setCertJson] = useState<ZkProofInput | null>(null);
  const [hash, setHash] = useState(BigInt(0));

  const { data: isCertVerified } = useReadContract({
    abi: abi,
    functionName: "is_certificate_verified",
    address: CONTRACT_ADDRESS,
    args: [hash],
    watch: true,
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

  const handleVerifying = async () => {
    if (!certJson) {
      setError("Please upload your certificate JSON first.");
      return;
    }

    setLoading(true);
    setError("");
    setStatus("");

    try {
      const fields = [
        BigInt(certJson.issuer),
        BigInt(certJson.issued_at),
        BigInt(certJson.valid_until),
        BigInt(certJson.is_valid),
        BigInt(certJson.owner),
        BigInt(certJson.year_of_birth),
      ];

      setHash(poseidon2Hash(fields));

      if (isCertVerified) {
        toast.success("Certificate verified successfully!");
        setStatus("✅ Certificate is valid.");
      }
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
