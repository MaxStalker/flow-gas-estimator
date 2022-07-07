import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { tx, config, query } from "@onflow/fcl";
import { send as httpSend } from "@onflow/transport-http";
import { request, gql } from "graphql-request";

const printLine = () =>
  console.log(
    "======================================================================="
  );

const flowFeesEnvironment = {
  mainnet: "0xf919ee77447b7497",
  testnet: "0x912d5440f7e3769e",
};

const setup = async (network) => {
  await config({
    "accessNode.api": `https://rest-${network}.onflow.org`,
    "sdk.transport": httpSend,
  });
};

const calculateCosts = async (network, inclusionEffort, executionEffort) => {
  const deploymentAddress = flowFeesEnvironment[network];
  const cadence = `
		import FlowFees from ${deploymentAddress}
		
		pub fun main(
			inclusionEffort: UFix64,
			executionEffort: UFix64
		): UFix64 {
			return FlowFees.computeFees(inclusionEffort: inclusionEffort, executionEffort: executionEffort)
		}
	`;
  const inclusion = inclusionEffort.toFixed(1);
  const execution = executionEffort.toFixed(1);
  console.log(inclusion, execution);
  const args = (arg, t) => [arg(inclusion, t.UFix64), arg(execution, t.UFix64)];
  console.log(`✨ ${network}: Calculating cost on chain...`);
  return query({
    cadence,
    args,
  });
};

const extractTxParams = (data) => {
  const {
    transaction: {
      events: { edges },
    },
  } = data.checkTransaction;
  const fees = edges.find((item) => {
    return item.node.type.id.includes("FeesDeducted");
  });
  const [inclusionEffort, executionEffort] = fees.node.fields
    .map((item) => item.value)
    .slice(1);
  return { inclusionEffort, executionEffort };
};

const readTransactionFees = async (id) => {
  // This toke is from https://testnet.flowscan.org requests and probably can expire unexpectedly
  const token = "5a477c43abe4ded25f1e8cc778a34911134e0590";
  const endpoint = `https://query.testnet.flowgraph.co/?token=${token}`;
  const query = gql`
    query TransactionEventsSectionQuery($id: ID!) {
      checkTransaction(id: $id) {
        transaction {
          eventTypes {
            id
            __typename
          }
          eventCount
          events(typeId: "A.912d5440f7e3769e.FlowFees.FeesDeducted") {
            edges {
              node {
                index
                type {
                  id
                  __typename
                }
                fields
                __typename
              }
              __typename
            }
            __typename
          }
          __typename
        }
        __typename
      }
    }
  `;
  const variables = {
    id,
  };
  console.log("✨ FlowScan: Fetching transaction data...");
  const data = await request(endpoint, query, variables);
  return extractTxParams(data);
};
const readTransactionFeesFromChain = async (id) => {
  const txData = await tx(id); // .onceSealed();
  console.log({ txData });
  return {
    inclusionEffort: 1,
    executionEffort: 1,
  };
};

(async () => {
  config({
    "accessNode.api": `https://rest-mainnet.onflow.org`,
    // "sdk.transport": httpSend,
  });
  const id = "b8573c025fd0ffbcd274f291d6bb86a9dd6ef741240c560442db3c9d5d700730";
  const txData = await tx(id).onceSealed()
  console.log({ txData });
  /*
  const supportedNetworks = ["mainnet", "testnet"];
  const argv = yargs(hideBin(process.argv))
    .usage("Usage: $0 <txId> [options]")
    .alias("n", "network")
    .describe("n", "Specify network  [ mainnet, testnet ]")
    .epilog("Made with love by Flow Developer Advocatos")
    .default({
      network: "mainnet",
    })
    .help("h").argv;

  const [id] = argv._;
  if (id.length !== 64) {
    console.log(
      `Incorrect transaction id length. Should be 64 characters... 😞`
    );
    return false;
  }

  const { network } = argv;
  await setup(network);
  printLine();
  console.log("\n    ⭐ Welcome to Gas Cost Estimator 3000! ⭐   \n");
  const { inclusionEffort, executionEffort } =
    await readTransactionFeesFromChain(id);
  const [cost] = await calculateCosts(
    network,
    inclusionEffort,
    executionEffort
  );
  console.log("💲Final Cost:", cost * Math.pow(10, 8), "\n");
  console.log("Thank you for using our services! 👋\n");
  printLine();

   */
  //.log("Network:", yar.network);
  //console.log("Id", yar.id)
  // await setup(yar.n);
  /*
  await setup("testnet");
  const [id] = process.argv.slice(2);
  if (!id) {
    console.log(`You forgot to specify transaction id 😞`);
    return false;
  }
  console.log("\n    ⭐ Welcome to Gas Cost Estimator 3000! ⭐   \n");
  const { inclusionEffort, executionEffort } =
    await readTransactionFeesFromChain(id);
  const [cost] = await calculateCosts(inclusionEffort, executionEffort);
  console.log(
    `\n💲Inclusion Cost: ${inclusionEffort}, 💲Execution Cost: ${executionEffort}`
  );
  console.log("💲Final Cost:", cost * Math.pow(10, 8), "\n");
  console.log("Thank you for using our services! 👋\n");
  printLine();
   */
})();
