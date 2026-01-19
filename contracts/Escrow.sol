// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ArcPayEscrow
 * @notice Multi-party escrow contract with conditional release for ArcPay SDK
 * @dev Supports native USDC deposits (Arc's native gas token, 18 decimals), milestone-based releases, and dispute resolution
 */
contract ArcPayEscrow is ReentrancyGuard, Ownable {
    // Escrow states
    enum EscrowState {
        Created,
        Funded,
        Released,
        Refunded,
        Disputed,
        Resolved
    }

    // Escrow structure
    struct Escrow {
        bytes32 id;
        address depositor;
        address beneficiary;
        address arbiter;
        uint256 amount;
        uint256 fundedAt;
        uint256 expiresAt;
        EscrowState state;
        string conditionHash; // IPFS hash or condition description
        uint256 releasedAmount;
        uint256 refundedAmount;
    }

    // Milestone structure
    struct Milestone {
        uint256 amount;
        string description;
        bool completed;
        uint256 completedAt;
    }

    // Dispute structure
    struct Dispute {
        bytes32 escrowId;
        address initiator;
        string reason;
        uint256 createdAt;
        bool resolved;
        address winner;
        uint256 depositorShare;
        uint256 beneficiaryShare;
    }

    // State variables
    uint256 public escrowCount;
    uint256 public disputeFee; // Fee in basis points (100 = 1%)
    address public feeCollector;

    // Mappings
    mapping(bytes32 => Escrow) public escrows;
    mapping(bytes32 => Milestone[]) public milestones;
    mapping(bytes32 => Dispute) public disputes;
    mapping(address => bytes32[]) public userEscrows;

    // Events
    event EscrowCreated(
        bytes32 indexed id,
        address indexed depositor,
        address indexed beneficiary,
        address arbiter,
        uint256 amount,
        uint256 expiresAt
    );

    event EscrowFunded(bytes32 indexed id, uint256 amount, uint256 fundedAt);

    event EscrowReleased(
        bytes32 indexed id,
        address indexed beneficiary,
        uint256 amount
    );

    event EscrowRefunded(
        bytes32 indexed id,
        address indexed depositor,
        uint256 amount
    );

    event MilestoneAdded(bytes32 indexed escrowId, uint256 index, uint256 amount);

    event MilestoneCompleted(
        bytes32 indexed escrowId,
        uint256 index,
        uint256 amount
    );

    event DisputeCreated(
        bytes32 indexed escrowId,
        address indexed initiator,
        string reason
    );

    event DisputeResolved(
        bytes32 indexed escrowId,
        address indexed winner,
        uint256 depositorShare,
        uint256 beneficiaryShare
    );

    // Errors
    error InvalidAddress();
    error InvalidAmount();
    error EscrowNotFound();
    error InvalidState();
    error NotAuthorized();
    error AlreadyFunded();
    error NotFunded();
    error EscrowExpired();
    error EscrowNotExpired();
    error DisputeExists();
    error NoDispute();
    error InvalidMilestone();
    error InvalidShares();
    error TransferFailed();

    constructor(address _feeCollector, uint256 _disputeFee) Ownable(msg.sender) {
        if (_feeCollector == address(0)) revert InvalidAddress();
        feeCollector = _feeCollector;
        disputeFee = _disputeFee;
    }

    /**
     * @notice Create a new escrow (without funding)
     * @param beneficiary Address to receive funds on release
     * @param arbiter Address to resolve disputes (can be address(0) for no arbiter)
     * @param amount Amount of native USDC to escrow
     * @param expiresAt Timestamp when escrow expires
     * @param conditionHash IPFS hash or description of release conditions
     */
    function createEscrow(
        address beneficiary,
        address arbiter,
        uint256 amount,
        uint256 expiresAt,
        string calldata conditionHash
    ) external returns (bytes32) {
        if (beneficiary == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (expiresAt <= block.timestamp) revert EscrowExpired();

        bytes32 id = keccak256(
            abi.encodePacked(
                msg.sender,
                beneficiary,
                amount,
                block.timestamp,
                escrowCount++
            )
        );

        escrows[id] = Escrow({
            id: id,
            depositor: msg.sender,
            beneficiary: beneficiary,
            arbiter: arbiter,
            amount: amount,
            fundedAt: 0,
            expiresAt: expiresAt,
            state: EscrowState.Created,
            conditionHash: conditionHash,
            releasedAmount: 0,
            refundedAmount: 0
        });

        userEscrows[msg.sender].push(id);
        userEscrows[beneficiary].push(id);
        if (arbiter != address(0)) {
            userEscrows[arbiter].push(id);
        }

        emit EscrowCreated(id, msg.sender, beneficiary, arbiter, amount, expiresAt);

        return id;
    }

    /**
     * @notice Fund an escrow with native USDC
     * @dev Accepts native USDC via msg.value (Arc's native gas token, 18 decimals)
     * @param escrowId ID of the escrow to fund
     */
    function fundEscrow(bytes32 escrowId) external payable nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        if (escrow.depositor == address(0)) revert EscrowNotFound();
        if (escrow.state != EscrowState.Created) revert InvalidState();
        if (msg.sender != escrow.depositor) revert NotAuthorized();
        if (block.timestamp >= escrow.expiresAt) revert EscrowExpired();
        if (msg.value != escrow.amount) revert InvalidAmount();

        escrow.state = EscrowState.Funded;
        escrow.fundedAt = block.timestamp;

        emit EscrowFunded(escrowId, escrow.amount, block.timestamp);
    }

    /**
     * @notice Create and fund escrow in one transaction
     * @dev Accepts native USDC via msg.value
     */
    function createAndFundEscrow(
        address beneficiary,
        address arbiter,
        uint256 amount,
        uint256 expiresAt,
        string calldata conditionHash
    ) external payable nonReentrant returns (bytes32) {
        if (beneficiary == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (msg.value != amount) revert InvalidAmount();
        if (expiresAt <= block.timestamp) revert EscrowExpired();

        bytes32 id = keccak256(
            abi.encodePacked(
                msg.sender,
                beneficiary,
                amount,
                block.timestamp,
                escrowCount++
            )
        );

        escrows[id] = Escrow({
            id: id,
            depositor: msg.sender,
            beneficiary: beneficiary,
            arbiter: arbiter,
            amount: amount,
            fundedAt: block.timestamp,
            expiresAt: expiresAt,
            state: EscrowState.Funded,
            conditionHash: conditionHash,
            releasedAmount: 0,
            refundedAmount: 0
        });

        userEscrows[msg.sender].push(id);
        userEscrows[beneficiary].push(id);
        if (arbiter != address(0)) {
            userEscrows[arbiter].push(id);
        }

        emit EscrowCreated(id, msg.sender, beneficiary, arbiter, amount, expiresAt);
        emit EscrowFunded(id, amount, block.timestamp);

        return id;
    }

    /**
     * @notice Add milestones to an escrow
     * @param escrowId ID of the escrow
     * @param amounts Array of milestone amounts
     * @param descriptions Array of milestone descriptions
     */
    function addMilestones(
        bytes32 escrowId,
        uint256[] calldata amounts,
        string[] calldata descriptions
    ) external {
        Escrow storage escrow = escrows[escrowId];
        if (escrow.depositor == address(0)) revert EscrowNotFound();
        if (msg.sender != escrow.depositor) revert NotAuthorized();
        if (escrow.state != EscrowState.Created && escrow.state != EscrowState.Funded)
            revert InvalidState();
        if (amounts.length != descriptions.length) revert InvalidAmount();

        uint256 totalMilestoneAmount;
        for (uint256 i = 0; i < amounts.length; i++) {
            totalMilestoneAmount += amounts[i];
            milestones[escrowId].push(Milestone({
                amount: amounts[i],
                description: descriptions[i],
                completed: false,
                completedAt: 0
            }));
            emit MilestoneAdded(escrowId, milestones[escrowId].length - 1, amounts[i]);
        }

        if (totalMilestoneAmount != escrow.amount) revert InvalidAmount();
    }

    /**
     * @notice Complete a milestone (depositor confirms work)
     * @param escrowId ID of the escrow
     * @param milestoneIndex Index of the milestone
     */
    function completeMilestone(bytes32 escrowId, uint256 milestoneIndex) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        if (escrow.depositor == address(0)) revert EscrowNotFound();
        if (msg.sender != escrow.depositor) revert NotAuthorized();
        if (escrow.state != EscrowState.Funded) revert InvalidState();
        if (milestoneIndex >= milestones[escrowId].length) revert InvalidMilestone();

        Milestone storage milestone = milestones[escrowId][milestoneIndex];
        if (milestone.completed) revert InvalidMilestone();

        milestone.completed = true;
        milestone.completedAt = block.timestamp;
        escrow.releasedAmount += milestone.amount;

        _safeTransfer(escrow.beneficiary, milestone.amount);

        emit MilestoneCompleted(escrowId, milestoneIndex, milestone.amount);

        // Check if all milestones completed
        bool allCompleted = true;
        for (uint256 i = 0; i < milestones[escrowId].length; i++) {
            if (!milestones[escrowId][i].completed) {
                allCompleted = false;
                break;
            }
        }
        if (allCompleted) {
            escrow.state = EscrowState.Released;
        }
    }

    /**
     * @notice Release full escrow to beneficiary (no milestones)
     * @param escrowId ID of the escrow
     */
    function releaseEscrow(bytes32 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        if (escrow.depositor == address(0)) revert EscrowNotFound();
        if (msg.sender != escrow.depositor) revert NotAuthorized();
        if (escrow.state != EscrowState.Funded) revert InvalidState();
        if (milestones[escrowId].length > 0) revert InvalidState(); // Use milestone completion instead

        uint256 releaseAmount = escrow.amount - escrow.releasedAmount;
        escrow.releasedAmount = escrow.amount;
        escrow.state = EscrowState.Released;

        _safeTransfer(escrow.beneficiary, releaseAmount);

        emit EscrowReleased(escrowId, escrow.beneficiary, releaseAmount);
    }

    /**
     * @notice Refund escrow to depositor (only after expiry)
     * @param escrowId ID of the escrow
     */
    function refundEscrow(bytes32 escrowId) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        if (escrow.depositor == address(0)) revert EscrowNotFound();
        if (msg.sender != escrow.depositor) revert NotAuthorized();
        if (escrow.state != EscrowState.Funded) revert InvalidState();
        if (block.timestamp < escrow.expiresAt) revert EscrowNotExpired();

        uint256 refundAmount = escrow.amount - escrow.releasedAmount;
        escrow.refundedAmount = refundAmount;
        escrow.state = EscrowState.Refunded;

        _safeTransfer(escrow.depositor, refundAmount);

        emit EscrowRefunded(escrowId, escrow.depositor, refundAmount);
    }

    /**
     * @notice Create a dispute
     * @param escrowId ID of the escrow
     * @param reason Description of the dispute
     */
    function createDispute(bytes32 escrowId, string calldata reason) external {
        Escrow storage escrow = escrows[escrowId];
        if (escrow.depositor == address(0)) revert EscrowNotFound();
        if (escrow.state != EscrowState.Funded) revert InvalidState();
        if (escrow.arbiter == address(0)) revert NotAuthorized();
        if (msg.sender != escrow.depositor && msg.sender != escrow.beneficiary)
            revert NotAuthorized();
        if (disputes[escrowId].createdAt > 0) revert DisputeExists();

        escrow.state = EscrowState.Disputed;

        disputes[escrowId] = Dispute({
            escrowId: escrowId,
            initiator: msg.sender,
            reason: reason,
            createdAt: block.timestamp,
            resolved: false,
            winner: address(0),
            depositorShare: 0,
            beneficiaryShare: 0
        });

        emit DisputeCreated(escrowId, msg.sender, reason);
    }

    /**
     * @notice Resolve a dispute (arbiter only)
     * @param escrowId ID of the escrow
     * @param depositorShare Percentage for depositor (0-10000, basis points)
     * @param beneficiaryShare Percentage for beneficiary (0-10000, basis points)
     */
    function resolveDispute(
        bytes32 escrowId,
        uint256 depositorShare,
        uint256 beneficiaryShare
    ) external nonReentrant {
        Escrow storage escrow = escrows[escrowId];
        if (escrow.depositor == address(0)) revert EscrowNotFound();
        if (msg.sender != escrow.arbiter) revert NotAuthorized();
        if (escrow.state != EscrowState.Disputed) revert InvalidState();
        if (depositorShare + beneficiaryShare != 10000) revert InvalidShares();

        Dispute storage dispute = disputes[escrowId];
        if (dispute.resolved) revert InvalidState();

        dispute.resolved = true;
        dispute.depositorShare = depositorShare;
        dispute.beneficiaryShare = beneficiaryShare;
        escrow.state = EscrowState.Resolved;

        uint256 remainingAmount = escrow.amount - escrow.releasedAmount;
        uint256 depositorAmount = (remainingAmount * depositorShare) / 10000;
        uint256 beneficiaryAmount = remainingAmount - depositorAmount;

        // Collect dispute fee
        uint256 fee = (remainingAmount * disputeFee) / 10000;
        if (fee > 0) {
            depositorAmount -= fee / 2;
            beneficiaryAmount -= fee / 2;
            _safeTransfer(feeCollector, fee);
        }

        if (depositorAmount > 0) {
            _safeTransfer(escrow.depositor, depositorAmount);
            escrow.refundedAmount = depositorAmount;
        }
        if (beneficiaryAmount > 0) {
            _safeTransfer(escrow.beneficiary, beneficiaryAmount);
            escrow.releasedAmount += beneficiaryAmount;
        }

        address winner = depositorShare > beneficiaryShare
            ? escrow.depositor
            : escrow.beneficiary;

        emit DisputeResolved(escrowId, winner, depositorShare, beneficiaryShare);
    }

    // Internal function for safe native transfers
    function _safeTransfer(address to, uint256 amount) internal {
        (bool success, ) = payable(to).call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    // View functions

    function getEscrow(bytes32 escrowId) external view returns (Escrow memory) {
        return escrows[escrowId];
    }

    function getMilestones(bytes32 escrowId) external view returns (Milestone[] memory) {
        return milestones[escrowId];
    }

    function getDispute(bytes32 escrowId) external view returns (Dispute memory) {
        return disputes[escrowId];
    }

    function getUserEscrows(address user) external view returns (bytes32[] memory) {
        return userEscrows[user];
    }

    // Admin functions

    function setDisputeFee(uint256 _disputeFee) external onlyOwner {
        disputeFee = _disputeFee;
    }

    function setFeeCollector(address _feeCollector) external onlyOwner {
        if (_feeCollector == address(0)) revert InvalidAddress();
        feeCollector = _feeCollector;
    }

    // Allow contract to receive native USDC
    receive() external payable {}
}
