// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title HardenedVault (v2 "Apex Steel")
/// @notice Same functions as v1, but every bug is fixed.
contract HardenedVault is AccessControl, ReentrancyGuard, Pausable, EIP712 {
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 private constant PAYOUT_TYPEHASH = keccak256(
        "Payout(uint256 claimId,address claimant,uint256 amount,uint256 nonce,uint256 deadline)"
    );
    uint256 public constant MAX_CLAIM = 5 ether;
    uint256 public constant SIGNATURE_WINDOW = 7 days;

    // FIX #4: a claim moves through fixed steps only: Filed -> Approved -> Paid
    enum Status { None, Filed, Approved, Paid }

    struct Claim {
        address claimant;
        uint256 amount;
        bytes32 incidentId;
        Status status;
        uint256 deadline;
    }

    address public owner;
    address public verifier;
    uint256 public claimCount;
    mapping(uint256 => Claim) public claims;
    mapping(uint256 => uint256) public nonces;          // FIX #3
    mapping(bytes32 => bool) public incidentClaimed;    // FIX #4

    event Funded(address indexed from, uint256 amount);
    event ClaimFiled(uint256 indexed id, address indexed claimant, uint256 amount, bytes32 incidentId);
    event ClaimApproved(uint256 indexed id, address indexed by);
    event ClaimPaid(uint256 indexed id, address indexed to, uint256 amount);
    event EmergencyWithdraw(address indexed to, uint256 amount);

    constructor(address _verifier) payable EIP712("ApexForgeVault", "1") {
        owner = msg.sender;
        verifier = _verifier;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, _verifier);
    }

    receive() external payable {
        emit Funded(msg.sender, msg.value);
    }

    // ---------- Normal flow ----------

    function fileClaim(uint256 amount, bytes32 incidentId) external whenNotPaused returns (uint256 id) {
        require(amount > 0 && amount <= MAX_CLAIM, "invalid amount");
        require(!incidentClaimed[incidentId], "incident already claimed"); // FIX #4
        incidentClaimed[incidentId] = true;

        id = claimCount++;
        claims[id] = Claim(msg.sender, amount, incidentId, Status.Filed, block.timestamp + SIGNATURE_WINDOW);
        emit ClaimFiled(id, msg.sender, amount, incidentId);
    }

    function approveClaim(uint256 id) external {
        require(hasRole(VERIFIER_ROLE, msg.sender), "not a verifier"); // FIX #2
        Claim storage c = claims[id];
        require(c.status == Status.Filed, "not filed");
        c.status = Status.Approved;
        emit ClaimApproved(id, msg.sender);
    }

    // FIX #1: nonReentrant guard + state is updated BEFORE money is sent
    function claim(uint256 id) external nonReentrant whenNotPaused {
        Claim storage c = claims[id];
        require(c.claimant == msg.sender, "not claimant");
        require(c.status != Status.Paid, "already paid");
        require(c.status == Status.Approved, "not approved");
        require(address(this).balance >= c.amount, "vault empty");

        uint256 amount = c.amount;
        c.status = Status.Paid;                     // 1. write the book FIRST
        emit ClaimPaid(id, msg.sender, amount);

        (bool ok, ) = msg.sender.call{value: amount}(""); // 2. send money LAST
        require(ok, "transfer failed");
    }

    // ---------- Signature payout ----------

    // FIX #3: typed signature with nonce and deadline
    function payWithSignature(uint256 id, bytes calldata sig) external nonReentrant whenNotPaused {
        Claim storage c = claims[id];

        bytes32 digest = _hashTypedDataV4(
            keccak256(abi.encode(PAYOUT_TYPEHASH, id, c.claimant, c.amount, nonces[id], c.deadline))
        );
        require(ECDSA.recover(digest, sig) == verifier, "bad signature or nonce used");
        require(block.timestamp <= c.deadline, "signature expired");
        require(c.status == Status.Filed || c.status == Status.Approved, "not payable");

        nonces[id]++;                               // this signature can never work again
        c.status = Status.Paid;
        uint256 amount = c.amount;
        address to = c.claimant;
        require(address(this).balance >= amount, "vault empty");
        emit ClaimPaid(id, to, amount);

        (bool ok, ) = to.call{value: amount}("");
        require(ok, "transfer failed");
    }

    // ---------- Owner functions ----------

    function emergencyWithdraw(address payable to) external {
        require(msg.sender == owner, "not owner"); // FIX #5: msg.sender, not tx.origin
        uint256 amount = address(this).balance;
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "transfer failed");
        emit EmergencyWithdraw(to, amount);
    }

    function pause() external {
        require(msg.sender == owner, "not owner");
        _pause();
    }

    function unpause() external {
        require(msg.sender == owner, "not owner");
        _unpause();
    }
}