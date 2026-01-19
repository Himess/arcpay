// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ArcPayStreamPayment
 * @notice Real-time streaming payments for ArcPay SDK
 * @dev Supports per-second native USDC streaming with pause/resume functionality
 * @dev On Arc, USDC is the native gas token (18 decimals)
 */
contract ArcPayStreamPayment is ReentrancyGuard {
    // Stream states
    enum StreamState {
        Active,
        Paused,
        Cancelled,
        Completed
    }

    // Stream structure
    struct Stream {
        bytes32 id;
        address sender;
        address recipient;
        uint256 totalAmount;
        uint256 claimedAmount;
        uint256 ratePerSecond;
        uint256 startTime;
        uint256 endTime;
        uint256 pausedAt;
        uint256 pausedDuration;
        StreamState state;
    }

    // State variables
    uint256 public streamCount;
    uint256 public protocolFee; // Basis points (100 = 1%)
    address public feeCollector;

    // Mappings
    mapping(bytes32 => Stream) public streams;
    mapping(address => bytes32[]) public senderStreams;
    mapping(address => bytes32[]) public recipientStreams;

    // Events
    event StreamCreated(
        bytes32 indexed id,
        address indexed sender,
        address indexed recipient,
        uint256 totalAmount,
        uint256 ratePerSecond,
        uint256 startTime,
        uint256 endTime
    );

    event StreamClaimed(bytes32 indexed id, address indexed recipient, uint256 amount);

    event StreamPaused(bytes32 indexed id, uint256 pausedAt);

    event StreamResumed(bytes32 indexed id, uint256 resumedAt, uint256 newEndTime);

    event StreamCancelled(
        bytes32 indexed id,
        uint256 senderRefund,
        uint256 recipientPayment
    );

    event StreamCompleted(bytes32 indexed id, uint256 totalClaimed);

    event StreamToppedUp(bytes32 indexed id, uint256 addedAmount, uint256 newEndTime);

    // Errors
    error InvalidAddress();
    error InvalidAmount();
    error InvalidDuration();
    error StreamNotFound();
    error InvalidState();
    error NotAuthorized();
    error NothingToClaim();
    error StreamNotStarted();
    error StreamEnded();
    error TransferFailed();

    constructor(address _feeCollector, uint256 _protocolFee) {
        if (_feeCollector == address(0)) revert InvalidAddress();
        feeCollector = _feeCollector;
        protocolFee = _protocolFee;
    }

    /**
     * @notice Create a new payment stream
     * @dev Accepts native USDC via msg.value (Arc's native gas token, 18 decimals)
     * @param recipient Address to receive streamed funds
     * @param duration Stream duration in seconds
     */
    function createStream(
        address recipient,
        uint256 totalAmount,
        uint256 duration
    ) external payable nonReentrant returns (bytes32) {
        if (recipient == address(0)) revert InvalidAddress();
        if (recipient == msg.sender) revert InvalidAddress();
        if (msg.value == 0) revert InvalidAmount();
        if (msg.value != totalAmount) revert InvalidAmount();
        if (duration == 0) revert InvalidDuration();

        uint256 ratePerSecond = totalAmount / duration;
        if (ratePerSecond == 0) revert InvalidAmount();

        bytes32 id = keccak256(
            abi.encodePacked(
                msg.sender,
                recipient,
                totalAmount,
                block.timestamp,
                streamCount++
            )
        );

        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + duration;

        streams[id] = Stream({
            id: id,
            sender: msg.sender,
            recipient: recipient,
            totalAmount: totalAmount,
            claimedAmount: 0,
            ratePerSecond: ratePerSecond,
            startTime: startTime,
            endTime: endTime,
            pausedAt: 0,
            pausedDuration: 0,
            state: StreamState.Active
        });

        senderStreams[msg.sender].push(id);
        recipientStreams[recipient].push(id);

        emit StreamCreated(
            id,
            msg.sender,
            recipient,
            totalAmount,
            ratePerSecond,
            startTime,
            endTime
        );

        return id;
    }

    /**
     * @notice Create a stream starting at a future time
     * @dev Accepts native USDC via msg.value
     */
    function createScheduledStream(
        address recipient,
        uint256 totalAmount,
        uint256 startTime,
        uint256 endTime
    ) external payable nonReentrant returns (bytes32) {
        if (recipient == address(0)) revert InvalidAddress();
        if (recipient == msg.sender) revert InvalidAddress();
        if (msg.value == 0) revert InvalidAmount();
        if (msg.value != totalAmount) revert InvalidAmount();
        if (startTime < block.timestamp) revert InvalidDuration();
        if (endTime <= startTime) revert InvalidDuration();

        uint256 duration = endTime - startTime;
        uint256 ratePerSecond = totalAmount / duration;
        if (ratePerSecond == 0) revert InvalidAmount();

        bytes32 id = keccak256(
            abi.encodePacked(
                msg.sender,
                recipient,
                totalAmount,
                block.timestamp,
                streamCount++
            )
        );

        streams[id] = Stream({
            id: id,
            sender: msg.sender,
            recipient: recipient,
            totalAmount: totalAmount,
            claimedAmount: 0,
            ratePerSecond: ratePerSecond,
            startTime: startTime,
            endTime: endTime,
            pausedAt: 0,
            pausedDuration: 0,
            state: StreamState.Active
        });

        senderStreams[msg.sender].push(id);
        recipientStreams[recipient].push(id);

        emit StreamCreated(
            id,
            msg.sender,
            recipient,
            totalAmount,
            ratePerSecond,
            startTime,
            endTime
        );

        return id;
    }

    /**
     * @notice Claim available streamed funds
     * @param streamId ID of the stream
     */
    function claim(bytes32 streamId) external nonReentrant returns (uint256) {
        Stream storage stream = streams[streamId];
        if (stream.sender == address(0)) revert StreamNotFound();
        if (msg.sender != stream.recipient) revert NotAuthorized();
        if (stream.state == StreamState.Cancelled || stream.state == StreamState.Completed)
            revert InvalidState();

        uint256 claimable = getClaimableAmount(streamId);
        if (claimable == 0) revert NothingToClaim();

        stream.claimedAmount += claimable;

        // Check if stream is complete
        if (stream.claimedAmount >= stream.totalAmount) {
            stream.state = StreamState.Completed;
            emit StreamCompleted(streamId, stream.claimedAmount);
        }

        // Calculate and deduct protocol fee
        uint256 fee = (claimable * protocolFee) / 10000;
        uint256 recipientAmount = claimable - fee;

        if (fee > 0) {
            _safeTransfer(feeCollector, fee);
        }
        _safeTransfer(stream.recipient, recipientAmount);

        emit StreamClaimed(streamId, stream.recipient, claimable);

        return claimable;
    }

    /**
     * @notice Pause a stream (sender only)
     * @param streamId ID of the stream
     */
    function pauseStream(bytes32 streamId) external {
        Stream storage stream = streams[streamId];
        if (stream.sender == address(0)) revert StreamNotFound();
        if (msg.sender != stream.sender) revert NotAuthorized();
        if (stream.state != StreamState.Active) revert InvalidState();

        stream.state = StreamState.Paused;
        stream.pausedAt = block.timestamp;

        emit StreamPaused(streamId, block.timestamp);
    }

    /**
     * @notice Resume a paused stream (sender only)
     * @param streamId ID of the stream
     */
    function resumeStream(bytes32 streamId) external {
        Stream storage stream = streams[streamId];
        if (stream.sender == address(0)) revert StreamNotFound();
        if (msg.sender != stream.sender) revert NotAuthorized();
        if (stream.state != StreamState.Paused) revert InvalidState();

        uint256 pauseDuration = block.timestamp - stream.pausedAt;
        stream.pausedDuration += pauseDuration;
        stream.endTime += pauseDuration;
        stream.pausedAt = 0;
        stream.state = StreamState.Active;

        emit StreamResumed(streamId, block.timestamp, stream.endTime);
    }

    /**
     * @notice Cancel a stream (sender only)
     * @param streamId ID of the stream
     */
    function cancelStream(bytes32 streamId) external nonReentrant {
        Stream storage stream = streams[streamId];
        if (stream.sender == address(0)) revert StreamNotFound();
        if (msg.sender != stream.sender) revert NotAuthorized();
        if (stream.state == StreamState.Cancelled || stream.state == StreamState.Completed)
            revert InvalidState();

        uint256 claimable = getClaimableAmount(streamId);
        uint256 recipientAmount = claimable;
        uint256 senderRefund = stream.totalAmount - stream.claimedAmount - claimable;

        stream.state = StreamState.Cancelled;
        stream.claimedAmount += claimable;

        if (recipientAmount > 0) {
            // Apply protocol fee
            uint256 fee = (recipientAmount * protocolFee) / 10000;
            if (fee > 0) {
                _safeTransfer(feeCollector, fee);
                recipientAmount -= fee;
            }
            _safeTransfer(stream.recipient, recipientAmount);
        }

        if (senderRefund > 0) {
            _safeTransfer(stream.sender, senderRefund);
        }

        emit StreamCancelled(streamId, senderRefund, claimable);
    }

    /**
     * @notice Top up a stream with additional funds
     * @dev Accepts native USDC via msg.value
     * @param streamId ID of the stream
     */
    function topUpStream(bytes32 streamId) external payable nonReentrant {
        Stream storage stream = streams[streamId];
        if (stream.sender == address(0)) revert StreamNotFound();
        if (msg.sender != stream.sender) revert NotAuthorized();
        if (stream.state != StreamState.Active && stream.state != StreamState.Paused)
            revert InvalidState();
        if (msg.value == 0) revert InvalidAmount();

        uint256 additionalAmount = msg.value;
        stream.totalAmount += additionalAmount;

        // Extend end time proportionally
        uint256 additionalDuration = additionalAmount / stream.ratePerSecond;
        stream.endTime += additionalDuration;

        emit StreamToppedUp(streamId, additionalAmount, stream.endTime);
    }

    // Internal function for safe native transfers
    function _safeTransfer(address to, uint256 amount) internal {
        (bool success, ) = payable(to).call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    // View functions

    /**
     * @notice Get claimable amount for a stream
     */
    function getClaimableAmount(bytes32 streamId) public view returns (uint256) {
        Stream storage stream = streams[streamId];
        if (stream.sender == address(0)) return 0;
        if (stream.state == StreamState.Cancelled || stream.state == StreamState.Completed)
            return 0;

        uint256 effectiveTime;
        if (stream.state == StreamState.Paused) {
            effectiveTime = stream.pausedAt;
        } else {
            effectiveTime = block.timestamp;
        }

        if (effectiveTime < stream.startTime) return 0;

        uint256 elapsedTime;
        if (effectiveTime >= stream.endTime) {
            elapsedTime = stream.endTime - stream.startTime - stream.pausedDuration;
        } else {
            elapsedTime = effectiveTime - stream.startTime - stream.pausedDuration;
        }

        uint256 totalStreamed = elapsedTime * stream.ratePerSecond;
        if (totalStreamed > stream.totalAmount) {
            totalStreamed = stream.totalAmount;
        }

        if (totalStreamed <= stream.claimedAmount) return 0;

        return totalStreamed - stream.claimedAmount;
    }

    /**
     * @notice Get stream details
     */
    function getStream(bytes32 streamId) external view returns (Stream memory) {
        return streams[streamId];
    }

    /**
     * @notice Get all streams for a sender
     */
    function getSenderStreams(address sender) external view returns (bytes32[] memory) {
        return senderStreams[sender];
    }

    /**
     * @notice Get all streams for a recipient
     */
    function getRecipientStreams(address recipient) external view returns (bytes32[] memory) {
        return recipientStreams[recipient];
    }

    /**
     * @notice Get stream progress
     */
    function getStreamProgress(bytes32 streamId)
        external
        view
        returns (
            uint256 totalAmount,
            uint256 claimedAmount,
            uint256 claimableAmount,
            uint256 remainingAmount,
            uint256 percentComplete
        )
    {
        Stream storage stream = streams[streamId];
        totalAmount = stream.totalAmount;
        claimedAmount = stream.claimedAmount;
        claimableAmount = getClaimableAmount(streamId);
        remainingAmount = totalAmount - claimedAmount - claimableAmount;
        percentComplete = totalAmount > 0
            ? ((claimedAmount + claimableAmount) * 100) / totalAmount
            : 0;
    }

    // Admin functions

    function setProtocolFee(uint256 _protocolFee) external {
        require(msg.sender == feeCollector, "Not authorized");
        require(_protocolFee <= 500, "Fee too high"); // Max 5%
        protocolFee = _protocolFee;
    }

    function setFeeCollector(address _feeCollector) external {
        require(msg.sender == feeCollector, "Not authorized");
        if (_feeCollector == address(0)) revert InvalidAddress();
        feeCollector = _feeCollector;
    }

    // Allow contract to receive native USDC
    receive() external payable {}
}
