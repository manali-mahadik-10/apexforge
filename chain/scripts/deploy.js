const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [owner, verifier, attacker] = await ethers.getSigners();
  const FUND = ethers.parseEther("10");

  const V1 = await ethers.getContractFactory("VulnerableVault");
  const vault1 = await V1.deploy(verifier.address, { value: FUND });
  await vault1.waitForDeployment();

  const V2 = await ethers.getContractFactory("HardenedVault");
  const vault2 = await V2.deploy(verifier.address, { value: FUND });
  await vault2.waitForDeployment();

  const Atk = await ethers.getContractFactory("AttackerContract");
  const atk1 = await Atk.connect(attacker).deploy(await vault1.getAddress());
  await atk1.waitForDeployment();
  const atk2 = await Atk.connect(attacker).deploy(await vault2.getAddress());
  await atk2.waitForDeployment();

  const out = {
    chainUrl: "http://127.0.0.1:8545",
    v1: { vault: await vault1.getAddress(), attacker: await atk1.getAddress() },
    v2: { vault: await vault2.getAddress(), attacker: await atk2.getAddress() },
  };

  const file = path.join(__dirname, "..", "..", "backend", "deployments.json");
  fs.writeFileSync(file, JSON.stringify(out, null, 2));

  console.log("Deployed. Saved to backend/deployments.json");
  console.log(out);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
