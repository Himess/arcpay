// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ArcPayStealthRegistry
 * @notice Stealth address registry for private USDC payments
 * @dev Implements EIP-5564 compatible stealth addresses for Arc blockchain
 * @dev Uses native USDC (Arc's gas token, 18 decimals) via payable functions
 */
contract ArcPayStealthRegistry is ReentrancyGuard {

    // Stealth meta-address components
    struct StealthMetaAddress {
        bytes spendingPubKey; // Compressed public key for spending
        bytes viewingPubKey; // Compressed public key for viewing
        uint256 registeredAt;
        bool active;
    }

    // Stealth payment announcement
    struct Announcement {
        bytes32 id;
        address stealthAddress;
        uint256 amount;
        bytes ephemeralPubKey; // Ephemeral public key for deriving shared secret
        bytes encryptedMemo; // Optional encrypted memo
        uint256 timestamp;
        bool claimed;
    }

    // State variables
    uint256 public announcementCount;

    // Mappings
    mapping(address => StealthMetaAddress) public metaAddresses;
    mapping(bytes32 => Announcement) public announcements;
    mapping(address => bytes32[]) public userAnnouncements; // announcements where user might be recipient

    // Indexes for scanning
    bytes32[] public allAnnouncements;
    mapping(address => uint256) public lastScannedIndex;

    // Events
    event MetaAddressRegistered(
        address indexed user,
        bytes spendingPubKey,
        bytes viewingPubKey
    );

    event MetaAddressUpdated(
        address indexed user,
        bytes spendingPubKey,
        bytes viewingPubKey
    );

    event MetaAddressDeactivated(address indexed user);

    event StealthPayment(
        bytes32 indexed id,
        address indexed stealthAddress,
        uint256 amount,
        bytes ephemeralPubKey,
        bytes encryptedMemo
    );

    event PaymentClaimed(
        bytes32 indexed id,
        address indexed stealthAddress,
        address indexed claimer,
        uint256 amount
    );

    // Errors
    error InvalidAddress();
    error InvalidPubKey();
    error InvalidAmount();
    error MetaAddressNotRegistered();
    error MetaAddressAlreadyRegistered();
    error MetaAddressInactive();
    error AnnouncementNotFound();
    error AlreadyClaimed();
    error NotAuthorized();
    error TransferFailed();

    constructor() {
        // No parameters needed - uses native USDC
    }

    /**
     * @notice Register a stealth meta-address
     * @param spendingPubKey Compressed spending public key (33 bytes)
     * @param viewingPubKey Compressed viewing public key (33 bytes)
     */
    function registerMetaAddress(
        bytes calldata spendingPubKey,
        bytes calldata viewingPubKey
    ) external {
        if (spendingPubKey.length != 33) revert InvalidPubKey();
        if (viewingPubKey.length != 33) revert InvalidPubKey();
        if (metaAddresses[msg.sender].registeredAt > 0)
            revert MetaAddressAlreadyRegistered();

        metaAddresses[msg.sender] = StealthMetaAddress({
            spendingPubKey: spendingPubKey,
            viewingPubKey: viewingPubKey,
            registeredAt: block.timestamp,
            active: true
        });

        emit MetaAddressRegistered(msg.sender, spendingPubKey, viewingPubKey);
    }

    /**
     * @notice Update stealth meta-address
     * @param spendingPubKey New spending public key
     * @param viewingPubKey New viewing public key
     */
    function updateMetaAddress(
        bytes calldata spendingPubKey,
        bytes calldata viewingPubKey
    ) external {
        if (spendingPubKey.length != 33) revert InvalidPubKey();
        if (viewingPubKey.length != 33) revert InvalidPubKey();
        if (metaAddresses[msg.sender].registeredAt == 0)
            revert MetaAddressNotRegistered();

        StealthMetaAddress storage meta = metaAddresses[msg.sender];
        meta.spendingPubKey = spendingPubKey;
        meta.viewingPubKey = viewingPubKey;

        emit MetaAddressUpdated(msg.sender, spendingPubKey, viewingPubKey);
    }

    /**
     * @notice Deactivate meta-address
     */
    function deactivateMetaAddress() external {
        if (metaAddresses[msg.sender].registeredAt == 0)
            revert MetaAddressNotRegistered();

        metaAddresses[msg.sender].active = false;

        emit MetaAddressDeactivated(msg.sender);
    }

    /**
     * @notice Reactivate meta-address
     */
    function reactivateMetaAddress() external {
        if (metaAddresses[msg.sender].registeredAt == 0)
            revert MetaAddressNotRegistered();

        metaAddresses[msg.sender].active = true;
    }

    /**
     * @notice Send a stealth payment
     * @dev Accepts native USDC via msg.value
     * @param stealthAddress Derived stealth address to receive funds
     * @param ephemeralPubKey Ephemeral public key for recipient to derive shared secret
     * @param encryptedMemo Optional encrypted memo (can be empty)
     */
    function sendStealthPayment(
        address stealthAddress,
        bytes calldata ephemeralPubKey,
        bytes calldata encryptedMemo
    ) external payable nonReentrant returns (bytes32) {
        if (stealthAddress == address(0)) revert InvalidAddress();
        if (msg.value == 0) revert InvalidAmount();
        if (ephemeralPubKey.length != 33) revert InvalidPubKey();

        bytes32 id = keccak256(
            abi.encodePacked(
                msg.sender,
                stealthAddress,
                msg.value,
                block.timestamp,
                announcementCount++
            )
        );

        announcements[id] = Announcement({
            id: id,
            stealthAddress: stealthAddress,
            amount: msg.value,
            ephemeralPubKey: ephemeralPubKey,
            encryptedMemo: encryptedMemo,
            timestamp: block.timestamp,
            claimed: false
        });

        allAnnouncements.push(id);

        // Transfer native USDC to stealth address
        (bool success, ) = payable(stealthAddress).call{value: msg.value}("");
        if (!success) revert TransferFailed();

        emit StealthPayment(
            id,
            stealthAddress,
            msg.value,
            ephemeralPubKey,
            encryptedMemo
        );

        return id;
    }

    /**
     * @notice Mark a payment as claimed (called by recipient after claiming)
     * @param announcementId ID of the announcement
     * @dev This is for tracking purposes - actual funds are already at stealth address
     */
    function markClaimed(bytes32 announcementId) external {
        Announcement storage announcement = announcements[announcementId];
        if (announcement.timestamp == 0) revert AnnouncementNotFound();
        if (msg.sender != announcement.stealthAddress) revert NotAuthorized();
        if (announcement.claimed) revert AlreadyClaimed();

        announcement.claimed = true;

        emit PaymentClaimed(
            announcementId,
            announcement.stealthAddress,
            msg.sender,
            announcement.amount
        );
    }

    // View functions

    /**
     * @notice Get meta-address for a user
     */
    function getMetaAddress(address user)
        external
        view
        returns (StealthMetaAddress memory)
    {
        return metaAddresses[user];
    }

    /**
     * @notice Get announcement by ID
     */
    function getAnnouncement(bytes32 id)
        external
        view
        returns (Announcement memory)
    {
        return announcements[id];
    }

    /**
     * @notice Get all announcements for scanning
     * @param fromIndex Start index
     * @param count Number of announcements to return
     */
    function getAnnouncements(uint256 fromIndex, uint256 count)
        external
        view
        returns (Announcement[] memory)
    {
        if (fromIndex >= allAnnouncements.length) {
            return new Announcement[](0);
        }

        uint256 endIndex = fromIndex + count;
        if (endIndex > allAnnouncements.length) {
            endIndex = allAnnouncements.length;
        }

        uint256 resultCount = endIndex - fromIndex;
        Announcement[] memory result = new Announcement[](resultCount);

        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = announcements[allAnnouncements[fromIndex + i]];
        }

        return result;
    }

    /**
     * @notice Get new announcements since last scan
     * @param count Max number of announcements to return
     */
    function getNewAnnouncements(uint256 count)
        external
        view
        returns (Announcement[] memory, uint256 newLastIndex)
    {
        uint256 startIndex = lastScannedIndex[msg.sender];
        uint256 total = allAnnouncements.length;

        if (startIndex >= total) {
            return (new Announcement[](0), startIndex);
        }

        uint256 available = total - startIndex;
        uint256 fetchCount = available < count ? available : count;

        Announcement[] memory result = new Announcement[](fetchCount);
        for (uint256 i = 0; i < fetchCount; i++) {
            result[i] = announcements[allAnnouncements[startIndex + i]];
        }

        newLastIndex = startIndex + fetchCount;
        return (result, newLastIndex);
    }

    /**
     * @notice Update last scanned index
     */
    function updateLastScanned(uint256 index) external {
        if (index > allAnnouncements.length) {
            index = allAnnouncements.length;
        }
        lastScannedIndex[msg.sender] = index;
    }

    /**
     * @notice Get total number of announcements
     */
    function getTotalAnnouncements() external view returns (uint256) {
        return allAnnouncements.length;
    }

    /**
     * @notice Check if an address has a registered meta-address
     */
    function isRegistered(address user) external view returns (bool) {
        return metaAddresses[user].registeredAt > 0 && metaAddresses[user].active;
    }

    // Allow contract to receive native USDC
    receive() external payable {}
}
