const { network } = require("hardhat");

async function main() {
  await network.provider.send(
    "evm_increaseTime",
    [90 * 24 * 60 * 60]
  );

  await network.provider.send("evm_mine");

  console.log("Skipped 90 days.");
}

main().catch(console.error);