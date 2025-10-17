import React, { useMemo, useState } from "react";
import { poseidon2Hash } from "@zkpassport/poseidon2";
import {
  useAccount,
  useContract,
  useSendTransaction,
} from "@starknet-react/core";
import { CONTRACT_ADDRESS } from "../../utils/constants";
import abi from "../../assets/json/abi";
import { FaSpinner } from "react-icons/fa";
import { toast } from "react-toastify";
import { useZkVerifier } from "../../helpers/gen_proof";
import type { ZkProofInput } from "@/lib/common-types";
import { sleep } from "../../utils/helpers";

function toMsBigIntFromLocalDateTime(value: string): bigint {
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) throw new Error("Invalid date/time");
  return BigInt(ms);
}

function currentISOForInput(minutesFromNow = 0) {
  const d = new Date(Date.now() + minutesFromNow * 60_000);
  const tzOffset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tzOffset * 60_000);
  return local.toISOString().slice(0, 16);
}

const randomNonceBytesHex = (length: number): `0x${string}` => {
  const newBytes = new Uint8Array(length);
  crypto.getRandomValues(newBytes);

  let hex: `0x${string}` = "0x";
  for (const byte of newBytes) {
    hex += byte.toString(16).padStart(2, "0");
  }
  return hex;
};

export default function RegisterCertForm() {
  const [issuedAt, setIssuedAt] = useState(currentISOForInput(-1));
  const [validUntil, setValidUntil] = useState(currentISOForInput(24 * 30));
  const [isValid, setIsValid] = useState(true);
  const [yob, setYob] = useState(1999);
  const [issuerHex, setIssuerHex] = useState(randomNonceBytesHex(8));
  const { address, account } = useAccount();
  const { generateProof } = useZkVerifier();
  const [callData, setCallData] = useState<any[]>([]);

  const { contract } = useContract({
    abi,
    address: CONTRACT_ADDRESS,
  });

  const { sendAsync: registerUser } = useSendTransaction({
    calls:
      contract && address
        ? [contract.populate("register", [callData.slice(1)])]
        : undefined,
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [downloadData, setDownloadData] = useState<any | null>(null);

  const canSubmit = useMemo(() => {
    return true;
  }, [yob, submitting]);

  function handleDownload() {
    if (!downloadData) return;
    const blob = new Blob([JSON.stringify(downloadData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "certificate.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setDownloadData(null);
    setSubmitting(true);

    try {
      const secretHex = randomNonceBytesHex(8);
      const input = {
        issuer: BigInt(issuerHex),
        issued_at: toMsBigIntFromLocalDateTime(issuedAt),
        valid_until: toMsBigIntFromLocalDateTime(validUntil),
        is_valid: BigInt(isValid),
        year_of_birth: BigInt(yob),
        secret: BigInt(secretHex),
        min_age_feature: 0n,
        now: BigInt(new Date().getMilliseconds()),
        owner: BigInt(address ?? 0),
        current_year: new Date().getFullYear(),
      };

      const fields = [
        input.issuer,
        input.issued_at,
        input.valid_until,
        input.is_valid,
        input.owner,
        input.year_of_birth,
      ];

      console.log(fields);

      // Chain poseidon2 hashes just like in Cairo
      let hash = poseidon2Hash(fields);
      console.log(`cert hash : ${hash}`);
      let accessNullifierHash: `0x${string}` = `0x${poseidon2Hash([
        hash,
        input.secret,
      ]).toString(16)}`;

      const zk_data: ZkProofInput = {
        issuer: `0x${input.issuer.toString(16)}`,
        // Convert u64 to BigInt and pad to 64 bits
        issued_at: `0x${BigInt(input.issued_at)
          .toString(16)
          .padStart(16, "0")}`,
        valid_until: `0x${BigInt(input.valid_until)
          .toString(16)
          .padStart(16, "0")}`,
        is_valid: !!input.is_valid,
        secret: `0x${input.secret.toString(16)}`,
        year_of_birth: Number(yob), // Ensure it's a number, not string
        hash: `0x${hash.toString(16)}`,
        min_age_feature: Number(18), // Explicitly convert to number
        access_nullifier: accessNullifierHash,
        now: `0x${BigInt(input.now).toString(16).padStart(16, "0")}`,
        owner: `0x${input.owner.toString(16)}`,
        current_year: Number(input.current_year),
      };

      console.log(`zk data : ${JSON.stringify(zk_data)}`);

      const { callData: proofCallData } = await generateProof(zk_data);
      console.log(proofCallData.slice(1));
      setCallData(proofCallData);

      await sleep(2000);

      const transaction = await registerUser();

      if (transaction?.transaction_hash) {
        console.log("Transaction submitted:", transaction.transaction_hash);
      }
      await account?.waitForTransaction(transaction.transaction_hash);
      toast.success("Registered successfully");

      console.log("Certificate data:", zk_data);

      setDownloadData(zk_data);

      handleDownload();
    } catch (err: any) {
      toast.error(err?.message);
      setError(err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Register Certificate</h2>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        {/* Issuer */}
        <div>
          <label className="mb-2 block text-sm font-medium">
            Issuer Public Key (hex)
          </label>
          <input
            className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-black focus:outline-none"
            placeholder="0x..."
            value={issuerHex}
            onChange={(e) => setIssuerHex(e.target.value as `0x${string}`)}
            autoComplete="off"
            spellCheck={false}
          />
          <p className="mt-1 text-xs text-gray-500">
            Expected raw hex (with or without 0x).
          </p>
        </div>

        {/* Issued at & Valid until */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">Issued At</label>
            <input
              type="datetime-local"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-black focus:outline-none"
              value={issuedAt}
              onChange={(e) => setIssuedAt(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium">
              Valid Until
            </label>
            <input
              type="datetime-local"
              className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-black focus:outline-none"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </div>
        </div>

        {/* is_valid */}
        <div className="flex items-center gap-3">
          <input
            id="is_valid"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
            checked={isValid}
            onChange={(e) => setIsValid(e.target.checked)}
          />
          <label htmlFor="is_valid" className="text-sm">
            Certificate is valid
          </label>
        </div>

        {/* Year of birth */}
        <div>
          <label className="mb-2 block text-sm font-medium">
            Year of Birth
          </label>
          <input
            type="number"
            min={1900}
            max={2100}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 focus:border-black focus:outline-none"
            value={yob}
            onChange={(e) => setYob(parseInt(e.target.value || "0", 10))}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? (
              <>
                <FaSpinner className="animate-spin w-5 h-5" />
              </>
            ) : (
              "Register"
            )}
          </button>

          <button
            type="button"
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm"
            onClick={() => {
              setIssuerHex("0x");
              setIssuedAt(currentISOForInput(-1));
              setValidUntil(currentISOForInput(24 * 30));
              setIsValid(true);
              setYob(1999);
              setError(null);
              setSuccess(null);
              setDownloadData(null);
            }}
          >
            Reset
          </button>
        </div>

        {/* Status messages */}
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            {success}
          </div>
        )}

        {/* Download button */}
        {downloadData && (
          <button
            type="button"
            onClick={handleDownload}
            className="mt-3 w-full rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-green-700"
          >
            Download Certificate (.json)
          </button>
        )}
      </form>
    </div>
  );
}
