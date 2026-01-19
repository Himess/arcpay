import { ethers } from "hardhat";

/**
 * ArcPay Smart Contract Deployment Script
 *
 * Deploys all ArcPay contracts to Arc Testnet.
 * Contracts now use native USDC (Arc's gas token, 18 decimals) via payable functions.
 */

// Fee configuration
const DISPUTE_FEE = 100; // 1% in basis points
const PROTOCOL_FEE = 50; // 0.5% in basis points

interface DeployedContracts {
  escrow: string;
  paymentChannel: string;
  streamPayment: string;
  stealthRegistry: string;
}

async function main(): Promise<DeployedContracts> {
  const [deployer] = await ethers.getSigners();

  console.log("=".repeat(60));
  console.log("ArcPay Smart Contract Deployment (Native USDC)");
  console.log("=".repeat(60));
  console.log(`Deployer: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Balance: ${ethers.formatEther(balance)} USDC`);

  const network = await ethers.provider.getNetwork();
  console.log(`Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log("=".repeat(60));

  // Deploy Escrow (no USDC address needed - uses native transfers)
  console.log("\n1. Deploying ArcPayEscrow (native USDC)...");
  const Escrow = await ethers.getContractFactory("ArcPayEscrow");
  const escrow = await Escrow.deploy(deployer.address, DISPUTE_FEE);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log(`   ArcPayEscrow deployed to: ${escrowAddress}`);

  // Deploy PaymentChannel (no constructor args - uses native transfers)
  console.log("\n2. Deploying ArcPayPaymentChannel (native USDC)...");
  const PaymentChannel = await ethers.getContractFactory("ArcPayPaymentChannel");
  const paymentChannel = await PaymentChannel.deploy();
  await paymentChannel.waitForDeployment();
  const paymentChannelAddress = await paymentChannel.getAddress();
  console.log(`   ArcPayPaymentChannel deployed to: ${paymentChannelAddress}`);

  // Deploy StreamPayment (no USDC address needed - uses native transfers)
  console.log("\n3. Deploying ArcPayStreamPayment (native USDC)...");
  const StreamPayment = await ethers.getContractFactory("ArcPayStreamPayment");
  const streamPayment = await StreamPayment.deploy(deployer.address, PROTOCOL_FEE);
  await streamPayment.waitForDeployment();
  const streamPaymentAddress = await streamPayment.getAddress();
  console.log(`   ArcPayStreamPayment deployed to: ${streamPaymentAddress}`);

  // Deploy StealthRegistry (no constructor args - uses native transfers)
  console.log("\n4. Deploying ArcPayStealthRegistry (native USDC)...");
  const StealthRegistry = await ethers.getContractFactory("ArcPayStealthRegistry");
  const stealthRegistry = await StealthRegistry.deploy();
  await stealthRegistry.waitForDeployment();
  const stealthRegistryAddress = await stealthRegistry.getAddress();
  console.log(`   ArcPayStealthRegistry deployed to: ${stealthRegistryAddress}`);

  console.log("\n" + "=".repeat(60));
  console.log("Deployment Complete!");
  console.log("=".repeat(60));

  const deployedContracts: DeployedContracts = {
    escrow: escrowAddress,
    paymentChannel: paymentChannelAddress,
    streamPayment: streamPaymentAddress,
    stealthRegistry: stealthRegistryAddress,
  };

  console.log("\nDeployed Contract Addresses:");
  console.log(JSON.stringify(deployedContracts, null, 2));

  // Write addresses to file
  const fs = await import("fs");
  fs.writeFileSync(
    "deployed-addresses.json",
    JSON.stringify(
      {
        network: network.name,
        chainId: network.chainId.toString(),
        deployedAt: new Date().toISOString(),
        note: "Native USDC contracts (18 decimals, payable functions)",
        contracts: deployedContracts,
      },
      null,
      2
    )
  );
  console.log("\nAddresses saved to deployed-addresses.json");

  console.log("\n⚠️  Don't forget to update these addresses in:");
  console.log("   - website/src/app/playground/page.tsx (CONTRACTS object)");
  console.log("   - src/contracts/addresses.ts");

  return deployedContracts;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
