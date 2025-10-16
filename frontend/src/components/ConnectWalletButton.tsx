import { ellipsify } from "../utils/ellipsify";
import { useConnect, useDisconnect, useAccount } from "@starknet-react/core";
export default function ConnectWalletButton() {
  const { address } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <div className="flex flex-col items-center space-y-2">
      <button
        onClick={
          address
            ? () => {
                disconnect();
              }
            : () => {
                connect();
              }
        }
        className={`cursor-pointer px-6 py-2 ${
          address
            ? "bg-red-600 hover:bg-red-700"
            : "bg-blue-600 hover:bg-blue-700"
        } text-white font-semibold rounded-lg transition-all duration-300 disabled:opacity-50`}
      >
        {!address
          ? "Connect Wallet"
          : address
          ? `Disconnect (${ellipsify(address)})`
          : "Connecting..."}
      </button>
    </div>
  );
}
