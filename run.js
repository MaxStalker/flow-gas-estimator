import { setEnvironment, extendEnvironment, executeScript } from "flow-cadut";
import { request, gql } from "graphql-request";

const printLine = () =>
  console.log(
    "======================================================================="
  );

const flowFeesEnvironment = {
  name: "FlowFees",
  mainnet: "0xf919ee77447b7497",
  testnet: "0x912d5440f7e3769e",
};

const setup = async (network) => {
  await extendEnvironment(flowFeesEnvironment);
  await setEnvironment(network);
};
const calculateCosts = async (inclusionEffort, executionEffort) => {
  const code = `
		import FlowFees from 0x912d5440f7e3769e
		
		pub fun main(
			inclusionEffort: UFix64,
			executionEffort: UFix64
		): UFix64 {
			return FlowFees.computeFees(inclusionEffort: inclusionEffort, executionEffort: executionEffort)
		}
	`;
  const args = [inclusionEffort, executionEffort];
  console.log("✨ Testnet: Calculating cost on chain...");
  return executeScript({ code, args });
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
    query TransactionEventsSectionQuery(
      $id: ID!
    ) {
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
    id
  };
  console.log("✨ FlowScan: Fetching transaction data...");
  const data = await request(endpoint, query, variables);
  return extractTxParams(data);
};

(async () => {
  await setup("testnet");
  const [id] = process.argv.slice(2);
  if (!id) {
    console.log(`You forgot to specify transaction id 😞`);
    return false;
  }
  printLine();
  console.log("\n    ⭐ Welcome to Gas Cost Estimator 3000! ⭐   \n");
  const { inclusionEffort, executionEffort } = await readTransactionFees(id);
  const [cost] = await calculateCosts(inclusionEffort, executionEffort);
  console.log(
    `\n💲Inclusion Cost: ${inclusionEffort}, 💲Execution Cost: ${executionEffort}`
  );
  console.log("💲Final Cost:", cost * Math.pow(10, 8), "\n");
  console.log("Thank you for using our services! 👋\n");
  printLine();
})();
