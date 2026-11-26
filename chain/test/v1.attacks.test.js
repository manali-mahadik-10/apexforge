const { expect } = require("chai");
const { ethers } = require("hardhat");

const ONE = ethers.parseEther("1");
const bal = (addr) => ethers.provider.getBalance(addr);

describe("VulnerableVault v1: normal flow + 5 attacks", function () {
  let owner, verifier, attacker, user;
  let vault, atk, vaultAddr, atkAddr;

  beforeEach(async () => {
    [owner, verifier, attacker, user] = await ethers.getSigners();

    const Vault = await ethers.getContractFactory("VulnerableVault");
    vault = await Vault.deploy(verifier.address, { value: ethers.parseEther("10") });
    await vault.waitForDeployment();
    vaultAddr = await vault.getAddress();

    const Atk = await ethers.getContractFactory("AttackerContract");
    atk = await Atk.connect(attacker).deploy(vaultAddr);
    await atk.waitForDeployment();
    atkAddr = await atk.getAddress();
  });

  it("NORMAL: file, approve, claim is paid correctly", async () => {
    await vault.connect(user).fileClaim(ONE, ethers.id("fire-001"));
    await vault.connect(verifier).approveClaim(0);
    const before = await bal(user.address);
    const tx = await vault.connect(user).claim(0);
    const r = await tx.wait();
    const gas = r.gasUsed * r.gasPrice;
    expect(await bal(user.address)).to.equal(before + ONE - gas);
    expect(await bal(vaultAddr)).to.equal(ethers.parseEther("9"));
  });

  it("ATTACK 1 reentrancy: vault drained to zero", async () => {
    await atk.fileLegitClaim(ONE, ethers.id("fire-001")); // honest 1 ETH claim
    await vault.connect(verifier).approveClaim(0);        // verifier approves it
    await atk.attackReentrancy(0);

    expect(await bal(vaultAddr)).to.equal(0n);
    expect(await bal(atkAddr)).to.equal(ethers.parseEther("10"));
    const paid = await vault.queryFilter(vault.filters.ClaimPaid());
    expect(paid.length).to.equal(10); // ONE claim paid TEN times
  });

  it("ATTACK 2 access bypass: fake claim approves itself and gets paid", async () => {
    await atk.attackAccessBypass(ethers.parseEther("5"), ethers.id("fake-001"));
    expect(await bal(atkAddr)).to.equal(ethers.parseEther("5"));
    expect(await bal(vaultAddr)).to.equal(ethers.parseEther("5"));
  });

  it("ATTACK 3 signature replay: one signature paid 5 times", async () => {
    await atk.fileLegitClaim(ONE, ethers.id("fire-002"));
    const hash = ethers.solidityPackedKeccak256(
      ["address", "uint256", "address", "uint256"],
      [vaultAddr, 0, atkAddr, ONE]
    );
    const sig = await verifier.signMessage(ethers.getBytes(hash)); // ONE real signature
    await atk.attackReplay(0, sig, 5);

    expect(await bal(atkAddr)).to.equal(ethers.parseEther("5")); // should be only 1
  });

  it("ATTACK 4 double claim: same incident paid twice", async () => {
    await atk.fileTwice(ONE, ethers.id("fire-003"));
    await vault.connect(verifier).approveClaim(0);
    await vault.connect(verifier).approveClaim(1);
    await atk.attackDoubleClaim();

    expect(await bal(atkAddr)).to.equal(ethers.parseEther("2")); // should be only 1
  });

  it("ATTACK 5 tx.origin: owner is tricked, funds stolen", async () => {
    const before = await bal(attacker.address);
    await atk.connect(owner).claimFreeReward(); // the OWNER innocently calls this

    expect(await bal(vaultAddr)).to.equal(0n);
    expect(await bal(attacker.address)).to.equal(before + ethers.parseEther("10"));
  });
});