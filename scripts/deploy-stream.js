const hre = require("hardhat");

/**
 * Deploy only StreamPayment contract
 */

const USDC_ADDRESS = "0x9746a23ad3f14ef05c4c1eb54e2f71da9f91b7f8";
const PROTOCOL_FEE = 50; // 0.5%

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying StreamPayment...");
  console.log(`Deployer: ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${hre.ethers.formatEther(balance)} ETH`);

  const StreamPayment = await hre.ethers.getContractFactory("ArcPayStreamPayment");

  // Deploy with lower gas price
  const streamPayment = await StreamPayment.deploy(
    USDC_ADDRESS,
    deployer.address,
    PROTOCOL_FEE,
    {
      gasLimit: 3000000,
    }
  );

  await streamPayment.waitForDeployment();
  const address = await streamPayment.getAddress();

  console.log(`StreamPayment deployed to: ${address}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
