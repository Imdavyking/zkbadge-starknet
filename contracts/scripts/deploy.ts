import { Account, CallData, Contract, RpcProvider, stark } from "starknet";
import * as dotenv from "dotenv";
import { getCompiledCode } from "./utils";
dotenv.config();

async function main() {
  const provider = new RpcProvider({
    nodeUrl: process.env.RPC_ENDPOINT,
  });

  // initialize existing predeployed account 0
  console.log("ACCOUNT_ADDRESS=", process.env.DEPLOYER_ADDRESS);
  const privateKey0 = process.env.DEPLOYER_PRIVATE_KEY ?? "";
  const accountAddress0: string = process.env.DEPLOYER_ADDRESS ?? "";
  const account0 = new Account(provider, accountAddress0, privateKey0);
  console.log("Account connected.\n");

  // Declare & deploy contract
  let sierraCode, casmCode, zkbadgeManager, casmCodZkbagdeManager;

  try {
    ({ sierraCode, casmCode } = await getCompiledCode(
      "verifier_UltraStarknetHonkVerifier"
    ));
    ({ sierraCode: zkbadgeManager, casmCode: casmCodZkbagdeManager } =
      await getCompiledCode("zkbadge_IZkBadgeImpl"));
  } catch (error: any) {
    console.log("Failed to read contract files");
    console.log(error);
    process.exit(1);
  }

  const declareResponse = await account0.declareIfNot({
    contract: sierraCode,
    casm: casmCode,
  });

  const myCallDataZkBadge = new CallData(zkbadgeManager.abi);

  console.log(`verifier class hash:${declareResponse.class_hash}`);

  const constructorZkBadge = myCallDataZkBadge.compile("constructor", {
    class_hash: declareResponse.class_hash,
  });

  const deployResponse = await account0.declareAndDeploy({
    contract: zkbadgeManager,
    casm: casmCodZkbagdeManager,
    constructorCalldata: constructorZkBadge,
    salt: stark.randomAddress(),
  });

  // Connect the new contract instance :
  const zkBadgeContract = new Contract(
    zkbadgeManager.abi,
    deployResponse.deploy.contract_address,
    provider
  );
  console.log(
    `✅ Contract has been deploy with the address: ${zkBadgeContract.address}`
  );
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
