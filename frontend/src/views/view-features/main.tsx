import type { DerivedCertVerificationContractState } from "@zkbadge/zkbadge-api";
import React, { useEffect } from "react";
import useDeployment from "../../hookes/useDeployment";
import { toast } from "react-toastify";
import { wait } from "../../utils/helpers";
import { Feature } from "./feature";

//
// ------------------- Types -------------------
//
export type FeatureJson = {
  id: string;
  creator: string; // hex address string
  name: string;
  description: string;
  category: string;
  image_url: string;
  min_age: number;
  price: number;
  created_at: number; // timestamp in ms
  is_active: boolean;
  coin_type: string; // hex string
};

//
// ------------------- Helpers -------------------
//

// Convert {0: 99, 1: 206, ...} into Uint8Array → hex string
function bytesToHex(bytesObj: Record<string, number>): string {
  const bytes = Object.values(bytesObj);
  return "0x" + Buffer.from(bytes).toString("hex");
}

function mapStateFeature(raw: any): FeatureJson {
  return {
    id: raw.id,
    creator: bytesToHex(raw.feature.creator.bytes),
    name: raw.feature.name,
    description: raw.feature.description,
    category: raw.feature.category,
    image_url: raw.feature.image_url,
    min_age: Number(raw.feature.min_age),
    price: Number(raw.feature.price),
    created_at: Number(raw.feature.created_at),
    is_active: raw.feature.is_active,
    coin_type: bytesToHex(raw.feature.coin_type),
  };
}

//
// ------------------- Component -------------------
//
const ViewFeatures: React.FC = () => {
  const deploymentContext = useDeployment();
  const deploymentProvider = deploymentContext?.zkBadgeApi;

  const [features, setFeatures] = React.useState<FeatureJson[]>([]);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    if (!deploymentContext?.hasJoined) {
      toast.info(`Joining contract...try again in a moment`);
      deploymentContext?.onJoinContract().then(async () => {
        await wait(1);
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

    if (!deploymentProvider) return;

    const stateSubscription = deploymentProvider.state.subscribe(
      (state: DerivedCertVerificationContractState) => {
        console.log("getting features");
        const mapped = state.features.map((f: any) => mapStateFeature(f));
        setFeatures(mapped);
      }
    );

    return () => {
      stateSubscription.unsubscribe();
    };
  }, [deploymentProvider]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Available Features
      </h1>

      {loading ? (
        <p className="text-gray-500">Loading features...</p>
      ) : features.length === 0 ? (
        <p className="text-gray-500">No features available</p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Feature key={feature.id} {...feature} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ViewFeatures;
