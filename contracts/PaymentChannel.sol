// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title ArcPayPaymentChannel
 * @notice Unidirectional payment channels for micropayments (x402 protocol compatible)
 * @dev Supports native USDC deposits (Arc's native gas token, 18 decimals), off-chain signed payments, and on-chain settlement
 */
contract ArcPayPaymentChannel is ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // Channel states
    enum ChannelState {
        Open,
        Closing,
        Closed
    }

    // Channel structure
    struct Channel {
        bytes32 id;
        address sender;
        address recipient;
        uint256 deposit;
        uint256 spent;
        uint256 nonce;
        ChannelState state;
        uint256 createdAt;
        uint256 closingAt;
        uint256 closedAt;
    }

    // Constants
    uint256 public constant DISPUTE_PERIOD = 1 hours; // Time to challenge closing
    uint256 public constant MIN_DEPOSIT = 1e15; // 0.001 USDC minimum (18 decimals)

    // State variables
    uint256 public channelCount;

    // Mappings
    mapping(bytes32 => Channel) public channels;
    mapping(address => bytes32[]) public senderChannels;
    mapping(address => bytes32[]) public recipientChannels;

    // Events
    event ChannelOpened(
        bytes32 indexed id,
        address indexed sender,
        address indexed recipient,
        uint256 deposit
    );

    event ChannelTopUp(bytes32 indexed id, uint256 additionalDeposit, uint256 newTotal);

    event ChannelClosing(bytes32 indexed id, uint256 spent, uint256 closingAt);

    event ChannelClosed(
        bytes32 indexed id,
        uint256 senderRefund,
        uint256 recipientPayment
    );

    event ChannelDisputed(bytes32 indexed id, uint256 newSpent, uint256 newNonce);

    event PaymentSigned(
        bytes32 indexed channelId,
        uint256 amount,
        uint256 totalSpent,
        uint256 nonce
    );

    // Errors
    error InvalidAddress();
    error InvalidAmount();
    error InvalidDeposit();
    error ChannelNotFound();
    error InvalidState();
    error NotAuthorized();
    error InvalidSignature();
    error InvalidNonce();
    error DisputePeriodActive();
    error DisputePeriodExpired();
    error InsufficientBalance();
    error TransferFailed();

    /**
     * @notice Open a new payment channel
     * @dev Accepts native USDC via msg.value (Arc's native gas token, 18 decimals)
     * @param recipient Address to receive payments
     */
    function openChannel(
        address recipient,
        uint256 deposit
    ) external payable nonReentrant returns (bytes32) {
        if (recipient == address(0)) revert InvalidAddress();
        if (recipient == msg.sender) revert InvalidAddress();
        if (msg.value < MIN_DEPOSIT) revert InvalidDeposit();
        if (msg.value != deposit) revert InvalidAmount();

        bytes32 id = keccak256(
            abi.encodePacked(
                msg.sender,
                recipient,
                block.timestamp,
                channelCount++
            )
        );

        channels[id] = Channel({
            id: id,
            sender: msg.sender,
            recipient: recipient,
            deposit: deposit,
            spent: 0,
            nonce: 0,
            state: ChannelState.Open,
            createdAt: block.timestamp,
            closingAt: 0,
            closedAt: 0
        });

        senderChannels[msg.sender].push(id);
        recipientChannels[recipient].push(id);

        emit ChannelOpened(id, msg.sender, recipient, deposit);

        return id;
    }

    /**
     * @notice Top up an existing channel with more native USDC
     * @dev Accepts native USDC via msg.value
     * @param channelId ID of the channel
     */
    function topUpChannel(bytes32 channelId) external payable nonReentrant {
        Channel storage channel = channels[channelId];
        if (channel.sender == address(0)) revert ChannelNotFound();
        if (msg.sender != channel.sender) revert NotAuthorized();
        if (channel.state != ChannelState.Open) revert InvalidState();
        if (msg.value == 0) revert InvalidAmount();

        channel.deposit += msg.value;

        emit ChannelTopUp(channelId, msg.value, channel.deposit);
    }

    /**
     * @notice Initiate channel closing (recipient presents final signed payment)
     * @param channelId ID of the channel
     * @param spent Total amount spent in channel
     * @param nonce Payment nonce
     * @param signature Sender's signature on the payment
     */
    function closeChannel(
        bytes32 channelId,
        uint256 spent,
        uint256 nonce,
        bytes calldata signature
    ) external nonReentrant {
        Channel storage channel = channels[channelId];
        if (channel.sender == address(0)) revert ChannelNotFound();
        if (msg.sender != channel.recipient) revert NotAuthorized();
        if (channel.state != ChannelState.Open) revert InvalidState();
        if (spent > channel.deposit) revert InsufficientBalance();

        // Verify signature
        bytes32 messageHash = getPaymentHash(channelId, spent, nonce);
        address signer = messageHash.toEthSignedMessageHash().recover(signature);
        if (signer != channel.sender) revert InvalidSignature();

        channel.spent = spent;
        channel.nonce = nonce;
        channel.state = ChannelState.Closing;
        channel.closingAt = block.timestamp + DISPUTE_PERIOD;

        emit ChannelClosing(channelId, spent, channel.closingAt);
    }

    /**
     * @notice Challenge a closing with a higher nonce payment
     * @param channelId ID of the channel
     * @param spent Total amount spent
     * @param nonce Payment nonce (must be higher than current)
     * @param signature Sender's signature
     */
    function disputeChannel(
        bytes32 channelId,
        uint256 spent,
        uint256 nonce,
        bytes calldata signature
    ) external {
        Channel storage channel = channels[channelId];
        if (channel.sender == address(0)) revert ChannelNotFound();
        if (channel.state != ChannelState.Closing) revert InvalidState();
        if (block.timestamp >= channel.closingAt) revert DisputePeriodExpired();
        if (nonce <= channel.nonce) revert InvalidNonce();
        if (spent > channel.deposit) revert InsufficientBalance();

        // Verify signature
        bytes32 messageHash = getPaymentHash(channelId, spent, nonce);
        address signer = messageHash.toEthSignedMessageHash().recover(signature);
        if (signer != channel.sender) revert InvalidSignature();

        channel.spent = spent;
        channel.nonce = nonce;

        emit ChannelDisputed(channelId, spent, nonce);
    }

    /**
     * @notice Finalize channel close after dispute period
     * @param channelId ID of the channel
     */
    function finalizeClose(bytes32 channelId) external nonReentrant {
        Channel storage channel = channels[channelId];
        if (channel.sender == address(0)) revert ChannelNotFound();
        if (channel.state != ChannelState.Closing) revert InvalidState();
        if (block.timestamp < channel.closingAt) revert DisputePeriodActive();

        channel.state = ChannelState.Closed;
        channel.closedAt = block.timestamp;

        uint256 recipientAmount = channel.spent;
        uint256 senderRefund = channel.deposit - channel.spent;

        if (recipientAmount > 0) {
            _safeTransfer(channel.recipient, recipientAmount);
        }
        if (senderRefund > 0) {
            _safeTransfer(channel.sender, senderRefund);
        }

        emit ChannelClosed(channelId, senderRefund, recipientAmount);
    }

    /**
     * @notice Cooperative close (both parties agree)
     * @param channelId ID of the channel
     * @param spent Final spent amount
     * @param senderSignature Sender's signature
     * @param recipientSignature Recipient's signature
     */
    function cooperativeClose(
        bytes32 channelId,
        uint256 spent,
        bytes calldata senderSignature,
        bytes calldata recipientSignature
    ) external nonReentrant {
        Channel storage channel = channels[channelId];
        if (channel.sender == address(0)) revert ChannelNotFound();
        if (channel.state != ChannelState.Open && channel.state != ChannelState.Closing)
            revert InvalidState();
        if (spent > channel.deposit) revert InsufficientBalance();

        // Verify both signatures
        bytes32 closeHash = keccak256(
            abi.encodePacked(channelId, spent, "cooperative_close")
        );

        address senderSigner = closeHash.toEthSignedMessageHash().recover(senderSignature);
        address recipientSigner = closeHash.toEthSignedMessageHash().recover(recipientSignature);

        if (senderSigner != channel.sender) revert InvalidSignature();
        if (recipientSigner != channel.recipient) revert InvalidSignature();

        channel.spent = spent;
        channel.state = ChannelState.Closed;
        channel.closedAt = block.timestamp;

        uint256 recipientAmount = spent;
        uint256 senderRefund = channel.deposit - spent;

        if (recipientAmount > 0) {
            _safeTransfer(channel.recipient, recipientAmount);
        }
        if (senderRefund > 0) {
            _safeTransfer(channel.sender, senderRefund);
        }

        emit ChannelClosed(channelId, senderRefund, recipientAmount);
    }

    /**
     * @notice Emergency close by sender (forfeits all funds to recipient)
     * @param channelId ID of the channel
     */
    function emergencyClose(bytes32 channelId) external nonReentrant {
        Channel storage channel = channels[channelId];
        if (channel.sender == address(0)) revert ChannelNotFound();
        if (msg.sender != channel.sender) revert NotAuthorized();
        if (channel.state == ChannelState.Closed) revert InvalidState();

        channel.spent = channel.deposit;
        channel.state = ChannelState.Closed;
        channel.closedAt = block.timestamp;

        _safeTransfer(channel.recipient, channel.deposit);

        emit ChannelClosed(channelId, 0, channel.deposit);
    }

    // Internal function for safe native transfers
    function _safeTransfer(address to, uint256 amount) internal {
        (bool success, ) = payable(to).call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    // Helper functions

    /**
     * @notice Get payment message hash for signing
     * @param channelId Channel ID
     * @param spent Total spent amount
     * @param nonce Payment nonce
     */
    function getPaymentHash(
        bytes32 channelId,
        uint256 spent,
        uint256 nonce
    ) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(channelId, spent, nonce));
    }

    /**
     * @notice Verify a payment signature (used off-chain by recipient)
     * @param channelId Channel ID
     * @param spent Total spent amount
     * @param nonce Payment nonce
     * @param signature Sender's signature
     */
    function verifyPayment(
        bytes32 channelId,
        uint256 spent,
        uint256 nonce,
        bytes calldata signature
    ) external view returns (bool) {
        Channel storage channel = channels[channelId];
        if (channel.sender == address(0)) return false;
        if (spent > channel.deposit) return false;

        bytes32 messageHash = getPaymentHash(channelId, spent, nonce);
        address signer = messageHash.toEthSignedMessageHash().recover(signature);

        return signer == channel.sender;
    }

    // View functions

    function getChannel(bytes32 channelId) external view returns (Channel memory) {
        return channels[channelId];
    }

    function getSenderChannels(address sender) external view returns (bytes32[] memory) {
        return senderChannels[sender];
    }

    function getRecipientChannels(address recipient) external view returns (bytes32[] memory) {
        return recipientChannels[recipient];
    }

    function getChannelBalance(bytes32 channelId) external view returns (uint256 available, uint256 spent) {
        Channel storage channel = channels[channelId];
        available = channel.deposit - channel.spent;
        spent = channel.spent;
    }

    // Allow contract to receive native USDC
    receive() external payable {}
}
