import { type ContractAddress } from "@midnight-ntwrk/compact-runtime";
import {
  concatMap,
  filter,
  firstValueFrom,
  interval,
  map,
  of,
  take,
  throwError,
  timeout,
} from "rxjs";
import { pipe as fnPipe } from "fp-ts/function";
import {
  type DAppConnectorAPI,
  type DAppConnectorWalletAPI,
  type ServiceUriConfig,
} from "@midnight-ntwrk/dapp-connector-api";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import {
  type BalancedTransaction,
  type UnbalancedTransaction,
  createBalancedTx,
} from "@midnight-ntwrk/midnight-js-types";
import {
  type CoinInfo,
  Transaction,
  type TransactionId,
} from "@midnight-ntwrk/ledger";
import { Transaction as ZswapTransaction } from "@midnight-ntwrk/zswap";
import semver from "semver";
import {
  getLedgerNetworkId,
  getZswapNetworkId,
} from "@midnight-ntwrk/midnight-js-network-id";

import {
  CertVerificationAPI,
  type CertVerificationContractProviders,
  type DeployedCertVerificationAPI,
  type CircuitKeys,
} from "@zkbadge/zkbadge-api"; // <--- changed import
import type { WalletAndProvider } from "./common-types";
import type { Logger } from "pino";

// -------------------------
// Connect wallet
// -------------------------
const connectWallet = async (): Promise<{
  wallet: DAppConnectorWalletAPI;
  uris: ServiceUriConfig;
}> => {
  const COMPATIBLE_CONNECTOR_API_VERSION = "1.x";
  return firstValueFrom(
    fnPipe(
      interval(100),
      map(() => window.midnight?.mnLace),
      filter(
        (connectorAPI): connectorAPI is DAppConnectorAPI => !!connectorAPI
      ),
      concatMap((connectorAPI) =>
        semver.satisfies(
          connectorAPI.apiVersion,
          COMPATIBLE_CONNECTOR_API_VERSION
        )
          ? of(connectorAPI)
          : throwError(() => {
              console.error(
                {
                  expected: COMPATIBLE_CONNECTOR_API_VERSION,
                  actual: connectorAPI.apiVersion,
                },
                "Incompatible version of wallet connector API"
              );
              return new Error(
                `Incompatible version of Midnight Lace wallet found. Require '${COMPATIBLE_CONNECTOR_API_VERSION}', got '${connectorAPI.apiVersion}'.`
              );
            })
      ),
      take(1),
      timeout({
        first: 1_000,
        with: () =>
          throwError(
            () =>
              new Error(
                "Could not find Midnight Lace wallet. Extension installed?"
              )
          ),
      }),
      concatMap(async (connectorAPI) => {
        await connectorAPI.isEnabled();
        return connectorAPI;
      }),
      timeout({
        first: 5_000,
        with: () =>
          throwError(
            () =>
              new Error(
                "Midnight Lace wallet has failed to respond. Extension enabled?"
              )
          ),
      }),
      concatMap(async (connectorAPI) => ({
        walletConnectorAPI: await connectorAPI.enable(),
        connectorAPI,
      })),
      concatMap(async ({ walletConnectorAPI, connectorAPI }) => {
        const uris = await connectorAPI.serviceUriConfig();
        return { wallet: walletConnectorAPI, uris };
      })
    )
  );
};

// -------------------------
// Initialize wallet & providers
// -------------------------
export const initialWalletAndProviders =
  async (): Promise<WalletAndProvider> => {
    const { wallet, uris } = await connectWallet();
    const walletState = await wallet.state();

    const providers: CertVerificationContractProviders = {
      privateStateProvider: levelPrivateStateProvider({
        privateStateStoreName: "zkbadge-private-state",
      }),
      zkConfigProvider: new FetchZkConfigProvider<CircuitKeys>(
        window.location.origin,
        fetch.bind(window)
      ),
      proofProvider: httpClientProofProvider(uris.proverServerUri),
      publicDataProvider: indexerPublicDataProvider(
        uris.indexerUri,
        uris.indexerWsUri
      ),
      walletProvider: {
        coinPublicKey: walletState.coinPublicKey,
        encryptionPublicKey: walletState.encryptionPublicKey,
        balanceTx(
          tx: UnbalancedTransaction,
          newCoins: CoinInfo[]
        ): Promise<BalancedTransaction> {
          return wallet
            .balanceAndProveTransaction(
              ZswapTransaction.deserialize(
                tx.serialize(getLedgerNetworkId()),
                getZswapNetworkId()
              ),
              newCoins
            )
            .then((zswapTx) =>
              Transaction.deserialize(
                zswapTx.serialize(getZswapNetworkId()),
                getLedgerNetworkId()
              )
            )
            .then(createBalancedTx);
        },
      },
      midnightProvider: {
        submitTx(tx: BalancedTransaction): Promise<TransactionId> {
          return wallet.submitTransaction(tx);
        },
      },
    };

    return { wallet, uris, providers };
  };

// -------------------------
// Deploy or connect to zkBadge contract
// -------------------------
export const resolve = async (
  providers: CertVerificationContractProviders,
  logger: Logger,
  contractAddress?: ContractAddress
): Promise<DeployedCertVerificationAPI> => {
  let api: DeployedCertVerificationAPI;

  if (contractAddress) {
    api = await CertVerificationAPI.joinCertVerificationContract(
      providers,
      contractAddress
    );
  } else {
    api = await CertVerificationAPI.deployCertVerificationContract(
      providers,
      logger as any
    );
  }

  return api;
};

// -------------------------
// Utility
// -------------------------
export const calculateExpiryDate = (duration: number, creationDate: number) => {
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const expiryDate = creationDate + duration * millisecondsPerDay;
  return new Date(expiryDate).toLocaleDateString();
};
