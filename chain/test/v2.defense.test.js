const { expect } = require("chai");
const { ethers } = require("hardhat");

const ONE = ethers.parseEther("1");
const bal = (addr) => ethers.provider.getBalance(addr);

describe("HardenedVault v2: same attacks, now blocked", function () {
  let owner, verifier, attacker, user;
  let vault, atk, vaultAddr, atkAddr;

  beforeEach(async () => {
    [owner, verifier, attacker, user] = await ethers.getSigners();

    const Vault = await ethers.getContractFactory("HardenedVault");
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

  it("ATTACK 1 reentrancy: BLOCKED, vault keeps all 10 ETH", async () => {
    await atk.fileLegitClaim(ONE, ethers.id("fire-001"));
    await vault.connect(verifier).approveClaim(0);
    await expect(atk.attackReentrancy(0)).to.be.reverted;

    expect(await bal(vaultAddr)).to.equal(ethers.parseEther("10"));
    expect(await bal(atkAddr)).to.equal(0n);
  });

  it("ATTACK 2 access bypass: BLOCKED with 'not a verifier'", async () => {
    await expect(
      atk.attackAccessBypass(ethers.parseEther("5"), ethers.id("fake-001"))
    ).to.be.revertedWith("not a verifier");

    expect(await bal(vaultAddr)).to.equal(ethers.parseEther("10"));
    expect(await bal(atkAddr)).to.equal(0n);
  });

  it("ATTACK 3 signature replay: first use works, replay BLOCKED", async () => {
    await atk.fileLegitClaim(ONE, ethers.id("fire-002"));
    const c = await vault.claims(0);
    const network = await ethers.provider.getNetwork();

    const domain = {
      name: "ApexForgeVault",
      version: "1",
      chainId: network.chainId,
      verifyingContract: vaultAddr,
    };
    const types = {
      Payout: [
        { name: "claimId", type: "uint256" },
        { name: "claimant", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };
    const value = { claimId: 0, claimant: atkAddr, amount: ONE, nonce: 0, deadline: c.deadline };
    const sig = await verifier.signTypedData(domain, types, value);

    await atk.attackReplay(0, sig, 1); // the honest single use works
    expect(await bal(atkAddr)).to.equal(ONE);

    await expect(atk.attackReplay(0, sig, 1)).to.be.revertedWith("bad signature or nonce used");
    expect(await bal(atkAddr)).to.equal(ONE); // still only 1 ETH
  });

  it("ATTACK 4 double claim: BLOCKED with 'incident already claimed'", async () => {
    await expect(atk.fileTwice(ONE, ethers.id("fire-003"))).to.be.revertedWith(
      "incident already claimed"
    );
    expect(await bal(vaultAddr)).to.equal(ethers.parseEther("10"));
  });

  it("ATTACK 5 tx.origin: BLOCKED with 'not owner'", async () => {
    await expect(atk.connect(owner).claimFreeReward()).to.be.revertedWith("not owner");
    expect(await bal(vaultAddr)).to.equal(ethers.parseEther("10"));
  });
});