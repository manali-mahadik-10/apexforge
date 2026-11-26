// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/// @title VulnerableVault (v1 "Raw Iron")
/// @notice DELIBERATELY INSECURE. Local educational use only. Never deploy publicly.
contract VulnerableVault {
    address public owner;
    address public verifier; // trusted signer for signature payouts

    struct Claim {
        address claimant;
        uint256 amount;
        bytes32 incidentId;
        bool approved;
        bool paid;
    }

    uint256 public claimCount;
    mapping(uint256 => Claim) public claims;

    event Funded(address indexed from, uint256 amount);
    event ClaimFiled(uint256 indexed id, address indexed claimant, uint256 amount, bytes32 incidentId);
    event ClaimApproved(uint256 indexed id, address indexed by);
    event ClaimPaid(uint256 indexed id, address indexed to, uint256 amount);
    event EmergencyWithdraw(address indexed to, uint256 amount);

    constructor(address _verifier) payable {
        owner = msg.sender;
        verifier = _verifier;
    }

    receive() external payable {
        emit Funded(msg.sender, msg.value);
    }

    // ---------- Normal flow ----------

    function fileClaim(uint256 amount, bytes32 incidentId) external returns (uint256 id) {
        // BUG #4 (double claim): incidentId is never checked for uniqueness
        id = claimCount++;
        claims[id] = Claim(msg.sender, amount, incidentId, false, false);
        emit ClaimFiled(id, msg.sender, amount, incidentId);
    }

    // BUG #2 (access control): anyone can approve, there is no verifier check
    function approveClaim(uint256 id) external {
        claims[id].approved = true;
        emit ClaimApproved(id, msg.sender);
    }

    function claim(uint256 id) external {
        Claim storage c = claims[id];
        require(c.claimant == msg.sender, "not claimant");
        require(c.approved, "not approved");
        require(!c.paid, "already paid");
        require(address(this).balance >= c.amount, "vault empty");

        // BUG #1 (reentrancy): money is sent BEFORE paid = true
        (bool ok, ) = msg.sender.call{value: c.amount}("");
        require(ok, "transfer failed");

        c.paid = true; // too late
        emit ClaimPaid(id, msg.sender, c.amount);
    }

    // ---------- Signature payout ----------

    function payWithSignature(uint256 id, bytes calldata sig) external {
        Claim storage c = claims[id];
        bytes32 h = keccak256(abi.encodePacked(address(this), id, c.claimant, c.amount));
        address signer = ECDSA.recover(MessageHashUtils.toEthSignedMessageHash(h), sig);
        require(signer == verifier, "bad signature");

        // BUG #3 (replay): no nonce, no deadline, no paid check.
        // The same signature works again and again.
        (bool ok, ) = c.claimant.call{value: c.amount}("");
        require(ok, "transfer failed");
        emit ClaimPaid(id, c.claimant, c.amount);
    }

    // ---------- Owner function ----------

    function emergencyWithdraw(address payable to) external {
        // BUG #5 (tx.origin): checks who STARTED the transaction, not who is calling
        require(tx.origin == owner, "not owner");
        uint256 amount = address(this).balance;
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "transfer failed");
        emit EmergencyWithdraw(to, amount);
    }
}