import React, { useState, useMemo } from "react";
import { toast } from "react-toastify";
import {
  useAccount,
  useContract,
  useSendTransaction,
} from "@starknet-react/core";
import { CONTRACT_ADDRESS, NATIVE_TOKEN } from "../../utils/constants";
import abi from "../../assets/json/abi";
import { FaSpinner } from "react-icons/fa";

function currentISOForInput(minutesFromNow = 0) {
  const d = new Date(Date.now() + minutesFromNow * 60_000);
  const tzOffset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - tzOffset * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function CreateFeatureForm() {
  const [featureName, setFeatureName] = useState("Driving License Access");
  const [minAge, setMinAge] = useState(18);
  const [description, setDescription] = useState(
    "Only users who are 18 years or older can unlock access to the Driving License Application Portal. Age is verified via zkBadge without revealing the exact date of birth."
  );
  const [category, setCategory] = useState("Driving License");
  const [imageUrl, setImageUrl] = useState(
    "https://media.istockphoto.com/id/471519418/photo/male-teenage-driver-looking-out-of-car-window.jpg?s=612x612&w=0&k=20&c=xDd2U49KiXzrxPWKG3X6tLUYIzpd8YcYwYCiXiB0Z-M="
  );
  const [price, setPrice] = useState(0.01);
  const [createdAt, setCreatedAt] = useState(currentISOForInput(0));
  const { address, account } = useAccount();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const { contract } = useContract({
    abi,
    address: CONTRACT_ADDRESS,
  });
  const { sendAsync: createFeature } = useSendTransaction({
    calls:
      contract && address
        ? [
            contract.populate("create_feature", [
              featureName,
              description,
              category,
              imageUrl,
              BigInt(minAge),
              BigInt(Math.trunc(price * 10 ** 18)),
              NATIVE_TOKEN,
            ]),
          ]
        : undefined,
  });

  const canSubmit = useMemo(() => {
    return (
      featureName.trim().length > 0 &&
      description.trim().length > 0 &&
      category.trim().length > 0 &&
      price > 0 &&
      !submitting
    );
  }, [featureName, description, category, price, submitting]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const transaction = await createFeature();

      if (transaction?.transaction_hash) {
        console.log("Transaction submitted:", transaction.transaction_hash);
      }
      await account?.waitForTransaction(transaction.transaction_hash);
      toast.success("Feature created successfully");
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setFeatureName("");
    setMinAge(18);
    setDescription("");
    setCategory("");
    setImageUrl("");
    setPrice(0);
    setCreatedAt(currentISOForInput(0));

    setError(null);
    setSuccess(null);
  }

  return (
    <div className="mx-auto max-w-xl p-6">
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">Create Feature</h2>
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
      >
        {/* Feature Name */}
        <div>
          <label className="mb-2 block text-sm font-medium">Feature Name</label>
          <input
            className="w-full rounded-xl border border-gray-300 px-3 py-2"
            value={featureName}
            onChange={(e) => setFeatureName(e.target.value)}
          />
        </div>

        {/* Minimum Age */}
        <div>
          <label className="mb-2 block text-sm font-medium">Minimum Age</label>
          <input
            type="number"
            min={0}
            className="w-full rounded-xl border border-gray-300 px-3 py-2"
            value={minAge}
            onChange={(e) => setMinAge(parseInt(e.target.value, 10))}
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-2 block text-sm font-medium">Description</label>
          <textarea
            className="w-full rounded-xl border border-gray-300 px-3 py-2"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Category */}
        <div>
          <label className="mb-2 block text-sm font-medium">Category</label>
          <input
            className="w-full rounded-xl border border-gray-300 px-3 py-2"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>

        {/* Image URL */}
        <div>
          <label className="mb-2 block text-sm font-medium">Image URL</label>
          <input
            type="url"
            className="w-full rounded-xl border border-gray-300 px-3 py-2"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
        </div>

        {/* Price */}
        <div>
          <label className="mb-2 block text-sm font-medium">Price</label>
          <input
            type="number"
            min={0.00000000001}
            step={0.001}
            className="w-full rounded-xl border border-gray-300 px-3 py-2"
            value={price}
            onChange={(e) => setPrice(parseFloat(e.target.value))}
          />
        </div>

        {/* Created At */}
        <div>
          <label className="mb-2 block text-sm font-medium">Created At</label>
          <input
            type="datetime-local"
            className="w-full rounded-xl border border-gray-300 px-3 py-2"
            value={createdAt}
            onChange={(e) => setCreatedAt(e.target.value)}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-xl bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? (
              <FaSpinner className="animate-spin w-5 h-5" />
            ) : (
              "Create Feature"
            )}
          </button>

          <button
            type="button"
            className="rounded-xl border border-gray-300 px-4 py-2 text-sm"
            onClick={handleReset}
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
      </form>
    </div>
  );
}
