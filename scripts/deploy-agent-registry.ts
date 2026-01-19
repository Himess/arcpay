import { ethers } from "hardhat";

async function main() {
  console.log("Deploying AgentRegistry to Arc Testnet...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Deployer address:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH\n");

  // USDC address on Arc Testnet
  const USDC_ADDRESS = "0x9746a23ad3f14ef05c4c1eb54e2f71da9f91b7f8";

  // Deploy AgentRegistry
  console.log("Deploying AgentRegistry...");
  const AgentRegistry = await ethers.getContractFactory("AgentRegistry");
  const agentRegistry = await AgentRegistry.deploy(USDC_ADDRESS);
  await agentRegistry.waitForDeployment();

  const agentRegistryAddress = await agentRegistry.getAddress();
  console.log("AgentRegistry deployed to:", agentRegistryAddress);

  console.log("\n========================================");
  console.log("DEPLOYMENT COMPLETE");
  console.log("========================================");
  console.log(`AgentRegistry: ${agentRegistryAddress}`);
  console.log("\nUpdate src/contracts/addresses.ts with:");
  console.log(`  agentRegistry: "${agentRegistryAddress}",`);
  console.log("========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
