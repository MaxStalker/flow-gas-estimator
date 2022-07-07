const { config, tx, query } = require("@onflow/fcl");
const yargs = require("yargs/yargs");

const printLine = () =>
  console.log(
    "======================================================================="
  );

const getTxData = async (id, timeout) => {
  return new Promise(async (resolve, reject) => {
    const timeoutReference = setTimeout(() => {
      reject();
    }, timeout);
    const txData = await tx(id).onceSealed();
    clearTimeout(timeoutReference);
    resolve(txData);
  }).catch((reason) => {
    printLine();
    console.error("Timeout reached :(");
    console.log("Try to increase timeout with -t flag.");
    console.log("Or maybe you've specified wrong transaction id");
    printLine();
    process.exit();
  });
};

const calculateCosts = async (network, inclusionEffort, executionEffort) => {
  const flowFeesEnvironment = {
    mainnet: "0xf919ee77447b7497",
    testnet: "0x912d5440f7e3769e",
  };

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

  const args = (arg, t) => [
    arg(inclusionEffort, t.UFix64),
    arg(executionEffort, t.UFix64),
  ];
  console.log(`✨ Calculating transaction cost on ${network}`);
  return query({
    cadence,
    args,
  });
};

const extractTxParams = (txData) => {
  const fees = txData.events.find((item) => {
    return item.type.includes("FlowFees.FeesDeducted");
  });
  return fees.data;
};

(async () => {
  printLine();
  console.log("\n    ⭐ Welcome to Gas Cost Estimator 3000! ⭐   \n");


  const defaultTimeout = 5000;
  const argv = yargs(process.argv.slice(2))
    .usage("Usage: $0 <txId> [options]")
    .alias("n", "network")
    .alias("t", "timeout")
    .describe("n", "Specify network  [ mainnet, testnet ]")
    .describe(
      "t",
      `Set time frame for fetching transaction. Default:${defaultTimeout}`
    )
    .epilog("♥ Made with love by Flow Developer Advocatos in 2022")
    .default({
      network: "mainnet",
      timeout: defaultTimeout,
    })
    .help("h").argv;

  const [id] = argv._;

  // tx id checks
  if (!id) {
    console.log(`You forgot to specify transaction id 😞`);
    printLine();
    return false;
  }
  if (id.length !== 64) {
    console.log(
      `Incorrect transaction id length. Should be 64 characters... 😞`
    );

    printLine();
    return false;
  }
  const { network, timeout } = argv;
  config({
    "accessNode.api": `https://rest-${network}.onflow.org`,
  });

  const idDotted = id.slice(0, 10) + "..." + id.slice(-10);
  console.log(`✨ Fetching events emitted by transaction ${idDotted}`);
  const txData = await getTxData(id, timeout);

  const { inclusionEffort, executionEffort } = extractTxParams(txData);
  const [cost] = await calculateCosts(
    network,
    inclusionEffort,
    executionEffort
  );
  console.log(
    `\n💲Inclusion Cost: ${inclusionEffort}, 💲Execution Cost: ${executionEffort}`
  );
  console.log("💲Final Cost:", cost * Math.pow(10, 8), "\n");
  console.log("Thank you for using our services! 👋\n");
  printLine();
})();
