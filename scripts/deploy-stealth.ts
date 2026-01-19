import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying StealthRegistry with:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Balance:", ethers.formatEther(balance), "USDC");
  
  const StealthRegistry = await ethers.getContractFactory("ArcPayStealthRegistry");
  const stealthRegistry = await StealthRegistry.deploy();
  await stealthRegistry.waitForDeployment();
  
  const address = await stealthRegistry.getAddress();
  console.log("ArcPayStealthRegistry deployed to:", address);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
