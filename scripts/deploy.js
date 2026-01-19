const hre = require("hardhat");

/**
 * ArcPay Smart Contract Deployment Script
 */

// Arc Testnet USDC address
const USDC_ADDRESS = "0x9746a23ad3f14ef05c4c1eb54e2f71da9f91b7f8";

// Fee configuration
const DISPUTE_FEE = 100; // 1% in basis points
const PROTOCOL_FEE = 50; // 0.5% in basis points

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("=".repeat(60));
  console.log("ArcPay Smart Contract Deployment");
  console.log("=".repeat(60));
  console.log(`Deployer: ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${hre.ethers.formatEther(balance)} ETH`);

  const network = await hre.ethers.provider.getNetwork();
  console.log(`Network: Chain ID ${network.chainId}`);
  console.log("=".repeat(60));

  // Deploy Escrow
  console.log("\n1. Deploying ArcPayEscrow...");
  const Escrow = await hre.ethers.getContractFactory("ArcPayEscrow");
  const escrow = await Escrow.deploy(USDC_ADDRESS, deployer.address, DISPUTE_FEE);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log(`   ArcPayEscrow deployed to: ${escrowAddress}`);

  // Deploy PaymentChannel
  console.log("\n2. Deploying ArcPayPaymentChannel...");
  const PaymentChannel = await hre.ethers.getContractFactory("ArcPayPaymentChannel");
  const paymentChannel = await PaymentChannel.deploy(USDC_ADDRESS);
  await paymentChannel.waitForDeployment();
  const paymentChannelAddress = await paymentChannel.getAddress();
  console.log(`   ArcPayPaymentChannel deployed to: ${paymentChannelAddress}`);

  // Deploy StealthRegistry
  console.log("\n3. Deploying ArcPayStealthRegistry...");
  const StealthRegistry = await hre.ethers.getContractFactory("ArcPayStealthRegistry");
  const stealthRegistry = await StealthRegistry.deploy(USDC_ADDRESS);
  await stealthRegistry.waitForDeployment();
  const stealthRegistryAddress = await stealthRegistry.getAddress();
  console.log(`   ArcPayStealthRegistry deployed to: ${stealthRegistryAddress}`);

  // Deploy StreamPayment
  console.log("\n4. Deploying ArcPayStreamPayment...");
  const StreamPayment = await hre.ethers.getContractFactory("ArcPayStreamPayment");
  const streamPayment = await StreamPayment.deploy(USDC_ADDRESS, deployer.address, PROTOCOL_FEE);
  await streamPayment.waitForDeployment();
  const streamPaymentAddress = await streamPayment.getAddress();
  console.log(`   ArcPayStreamPayment deployed to: ${streamPaymentAddress}`);

  console.log("\n" + "=".repeat(60));
  console.log("Deployment Complete!");
  console.log("=".repeat(60));

  const deployedContracts = {
    escrow: escrowAddress,
    paymentChannel: paymentChannelAddress,
    stealthRegistry: stealthRegistryAddress,
    streamPayment: streamPaymentAddress,
  };

  console.log("\nDeployed Contract Addresses:");
  console.log(JSON.stringify(deployedContracts, null, 2));

  // Write addresses to file
  const fs = require("fs");
  fs.writeFileSync(
    "deployed-addresses.json",
    JSON.stringify(
      {
        network: "arc-testnet",
        chainId: network.chainId.toString(),
        deployedAt: new Date().toISOString(),
        usdc: USDC_ADDRESS,
        contracts: deployedContracts,
      },
      null,
      2
    )
  );
  console.log("\nAddresses saved to deployed-addresses.json");

  return deployedContracts;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
