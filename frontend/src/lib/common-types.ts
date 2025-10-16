import type {
  CertVerificationContractProviders,
  DeployedCertVerificationAPI,
} from "@zkbadge/zkbadge-api";
import type {
  DAppConnectorWalletAPI,
  ServiceUriConfig,
} from "@midnight-ntwrk/dapp-connector-api";

export interface WalletAndProvider {
  readonly wallet: DAppConnectorWalletAPI;
  readonly uris: ServiceUriConfig;
  readonly providers: CertVerificationContractProviders;
}

export interface WalletAPI {
  wallet: DAppConnectorWalletAPI;
  coinPublicKey: string;
  encryptionPublicKey: string;
  uris: ServiceUriConfig;
}

export interface ZkBadgeDeployment {
  status: "inprogress" | "deployed" | "failed";
  api: DeployedCertVerificationAPI;
}
