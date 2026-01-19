/**
 * ArcPay Contract ABIs
 *
 * Minimal ABIs for interacting with deployed contracts.
 */

export const ESCROW_ABI = [
  // Read functions
  "function getEscrow(bytes32 escrowId) external view returns (tuple(bytes32 id, address depositor, address beneficiary, address arbiter, address token, uint256 amount, uint256 fundedAt, uint256 expiresAt, uint8 state, string conditionHash, uint256 releasedAmount, uint256 refundedAmount))",
  "function getMilestones(bytes32 escrowId) external view returns (tuple(uint256 amount, string description, bool completed, uint256 completedAt)[])",
  "function getDispute(bytes32 escrowId) external view returns (tuple(bytes32 escrowId, address initiator, string reason, uint256 createdAt, bool resolved, address winner, uint256 depositorShare, uint256 beneficiaryShare))",
  "function getUserEscrows(address user) external view returns (bytes32[])",

  // Write functions
  "function createEscrow(address beneficiary, address arbiter, uint256 amount, uint256 expiresAt, string calldata conditionHash) external returns (bytes32)",
  "function fundEscrow(bytes32 escrowId) external",
  "function createAndFundEscrow(address beneficiary, address arbiter, uint256 amount, uint256 expiresAt, string calldata conditionHash) external returns (bytes32)",
  "function addMilestones(bytes32 escrowId, uint256[] calldata amounts, string[] calldata descriptions) external",
  "function completeMilestone(bytes32 escrowId, uint256 milestoneIndex) external",
  "function releaseEscrow(bytes32 escrowId) external",
  "function refundEscrow(bytes32 escrowId) external",
  "function createDispute(bytes32 escrowId, string calldata reason) external",
  "function resolveDispute(bytes32 escrowId, uint256 depositorShare, uint256 beneficiaryShare) external",

  // Events
  "event EscrowCreated(bytes32 indexed id, address indexed depositor, address indexed beneficiary, address arbiter, uint256 amount, uint256 expiresAt)",
  "event EscrowFunded(bytes32 indexed id, uint256 amount, uint256 fundedAt)",
  "event EscrowReleased(bytes32 indexed id, address indexed beneficiary, uint256 amount)",
  "event EscrowRefunded(bytes32 indexed id, address indexed depositor, uint256 amount)",
  "event MilestoneAdded(bytes32 indexed escrowId, uint256 index, uint256 amount)",
  "event MilestoneCompleted(bytes32 indexed escrowId, uint256 index, uint256 amount)",
  "event DisputeCreated(bytes32 indexed escrowId, address indexed initiator, string reason)",
  "event DisputeResolved(bytes32 indexed escrowId, address indexed winner, uint256 depositorShare, uint256 beneficiaryShare)",
] as const;

export const PAYMENT_CHANNEL_ABI = [
  // Read functions
  "function getChannel(bytes32 channelId) external view returns (tuple(bytes32 id, address sender, address recipient, address token, uint256 deposit, uint256 spent, uint256 nonce, uint8 state, uint256 createdAt, uint256 closingAt, uint256 closedAt))",
  "function getSenderChannels(address sender) external view returns (bytes32[])",
  "function getRecipientChannels(address recipient) external view returns (bytes32[])",
  "function getChannelBalance(bytes32 channelId) external view returns (uint256 available, uint256 spent)",
  "function getPaymentHash(bytes32 channelId, uint256 spent, uint256 nonce) external pure returns (bytes32)",
  "function verifyPayment(bytes32 channelId, uint256 spent, uint256 nonce, bytes calldata signature) external view returns (bool)",
  "function DISPUTE_PERIOD() external view returns (uint256)",
  "function MIN_DEPOSIT() external view returns (uint256)",

  // Write functions
  "function openChannel(address recipient, uint256 deposit) external returns (bytes32)",
  "function topUpChannel(bytes32 channelId, uint256 additionalDeposit) external",
  "function closeChannel(bytes32 channelId, uint256 spent, uint256 nonce, bytes calldata signature) external",
  "function disputeChannel(bytes32 channelId, uint256 spent, uint256 nonce, bytes calldata signature) external",
  "function finalizeClose(bytes32 channelId) external",
  "function cooperativeClose(bytes32 channelId, uint256 spent, bytes calldata senderSignature, bytes calldata recipientSignature) external",
  "function emergencyClose(bytes32 channelId) external",

  // Events
  "event ChannelOpened(bytes32 indexed id, address indexed sender, address indexed recipient, uint256 deposit)",
  "event ChannelTopUp(bytes32 indexed id, uint256 additionalDeposit, uint256 newTotal)",
  "event ChannelClosing(bytes32 indexed id, uint256 spent, uint256 closingAt)",
  "event ChannelClosed(bytes32 indexed id, uint256 senderRefund, uint256 recipientPayment)",
  "event ChannelDisputed(bytes32 indexed id, uint256 newSpent, uint256 newNonce)",
] as const;

export const STEALTH_REGISTRY_ABI = [
  // Read functions
  "function getMetaAddress(address user) external view returns (tuple(bytes spendingPubKey, bytes viewingPubKey, uint256 registeredAt, bool active))",
  "function getAnnouncement(bytes32 id) external view returns (tuple(bytes32 id, address stealthAddress, uint256 amount, bytes ephemeralPubKey, bytes encryptedMemo, uint256 timestamp, bool claimed))",
  "function getAnnouncements(uint256 fromIndex, uint256 count) external view returns (tuple(bytes32 id, address stealthAddress, uint256 amount, bytes ephemeralPubKey, bytes encryptedMemo, uint256 timestamp, bool claimed)[])",
  "function getNewAnnouncements(uint256 count) external view returns (tuple(bytes32 id, address stealthAddress, uint256 amount, bytes ephemeralPubKey, bytes encryptedMemo, uint256 timestamp, bool claimed)[], uint256 newLastIndex)",
  "function getTotalAnnouncements() external view returns (uint256)",
  "function isRegistered(address user) external view returns (bool)",
  "function lastScannedIndex(address user) external view returns (uint256)",

  // Write functions (sendStealthPayment is now payable)
  "function registerMetaAddress(bytes calldata spendingPubKey, bytes calldata viewingPubKey) external",
  "function updateMetaAddress(bytes calldata spendingPubKey, bytes calldata viewingPubKey) external",
  "function deactivateMetaAddress() external",
  "function reactivateMetaAddress() external",
  "function sendStealthPayment(address stealthAddress, bytes calldata ephemeralPubKey, bytes calldata encryptedMemo) external payable returns (bytes32)",
  "function markClaimed(bytes32 announcementId) external",
  "function updateLastScanned(uint256 index) external",

  // Events
  "event MetaAddressRegistered(address indexed user, bytes spendingPubKey, bytes viewingPubKey)",
  "event MetaAddressUpdated(address indexed user, bytes spendingPubKey, bytes viewingPubKey)",
  "event MetaAddressDeactivated(address indexed user)",
  "event StealthPayment(bytes32 indexed id, address indexed stealthAddress, uint256 amount, bytes ephemeralPubKey, bytes encryptedMemo)",
  "event PaymentClaimed(bytes32 indexed id, address indexed stealthAddress, address indexed claimer, uint256 amount)",
] as const;

export const STREAM_PAYMENT_ABI = [
  // Read functions
  "function getStream(bytes32 streamId) external view returns (tuple(bytes32 id, address sender, address recipient, address token, uint256 totalAmount, uint256 claimedAmount, uint256 ratePerSecond, uint256 startTime, uint256 endTime, uint256 pausedAt, uint256 pausedDuration, uint8 state))",
  "function getSenderStreams(address sender) external view returns (bytes32[])",
  "function getRecipientStreams(address recipient) external view returns (bytes32[])",
  "function getClaimableAmount(bytes32 streamId) external view returns (uint256)",
  "function getStreamProgress(bytes32 streamId) external view returns (uint256 totalAmount, uint256 claimedAmount, uint256 claimableAmount, uint256 remainingAmount, uint256 percentComplete)",
  "function protocolFee() external view returns (uint256)",

  // Write functions
  "function createStream(address recipient, uint256 totalAmount, uint256 duration) external returns (bytes32)",
  "function createScheduledStream(address recipient, uint256 totalAmount, uint256 startTime, uint256 endTime) external returns (bytes32)",
  "function claim(bytes32 streamId) external returns (uint256)",
  "function pauseStream(bytes32 streamId) external",
  "function resumeStream(bytes32 streamId) external",
  "function cancelStream(bytes32 streamId) external",
  "function topUpStream(bytes32 streamId, uint256 additionalAmount) external",

  // Events
  "event StreamCreated(bytes32 indexed id, address indexed sender, address indexed recipient, uint256 totalAmount, uint256 ratePerSecond, uint256 startTime, uint256 endTime)",
  "event StreamClaimed(bytes32 indexed id, address indexed recipient, uint256 amount)",
  "event StreamPaused(bytes32 indexed id, uint256 pausedAt)",
  "event StreamResumed(bytes32 indexed id, uint256 resumedAt, uint256 newEndTime)",
  "event StreamCancelled(bytes32 indexed id, uint256 senderRefund, uint256 recipientPayment)",
  "event StreamCompleted(bytes32 indexed id, uint256 totalClaimed)",
  "event StreamToppedUp(bytes32 indexed id, uint256 addedAmount, uint256 newEndTime)",
] as const;

export const AGENT_REGISTRY_ABI = [
  // Read functions
  "function getAgentConfig(address agent) external view returns (tuple(address owner, uint256 dailyBudget, uint256 perTxLimit, uint256 todaySpent, uint256 lastResetTimestamp, bool active))",
  "function getAgentBalance(address agent) external view returns (uint256)",
  "function getRemainingDailyBudget(address agent) external view returns (uint256)",
  "function isWhitelisted(address agent, address addr) external view returns (bool)",
  "function isBlacklisted(address agent, address addr) external view returns (bool)",
  "function getWhitelist(address agent) external view returns (address[])",
  "function getBlacklist(address agent) external view returns (address[])",
  "function usdc() external view returns (address)",

  // Write functions
  "function registerAgent(address agent, uint256 dailyBudget, uint256 perTxLimit) external",
  "function updateAgent(address agent, uint256 newDailyBudget, uint256 newPerTxLimit) external",
  "function deactivateAgent(address agent) external",
  "function reactivateAgent(address agent) external",
  "function addToWhitelist(address agent, address addr) external",
  "function removeFromWhitelist(address agent, address addr) external",
  "function addToBlacklist(address agent, address addr) external",
  "function removeFromBlacklist(address agent, address addr) external",
  "function executePayment(address recipient, uint256 amount, string calldata memo) external",
  "function depositFunds(address agent, uint256 amount) external",
  "function depositFundsNative(address agent) external payable",
  "function withdrawFunds(address agent, uint256 amount) external",

  // Events
  "event AgentRegistered(address indexed agent, address indexed owner, uint256 dailyBudget, uint256 perTxLimit)",
  "event AgentUpdated(address indexed agent, uint256 newDailyBudget, uint256 newPerTxLimit)",
  "event AgentDeactivated(address indexed agent)",
  "event AgentReactivated(address indexed agent)",
  "event PaymentExecuted(address indexed agent, address indexed recipient, uint256 amount, string memo)",
  "event PaymentBlocked(address indexed agent, address indexed recipient, uint256 amount, string reason)",
  "event AddedToWhitelist(address indexed agent, address indexed addr)",
  "event RemovedFromWhitelist(address indexed agent, address indexed addr)",
  "event AddedToBlacklist(address indexed agent, address indexed addr)",
  "event RemovedFromBlacklist(address indexed agent, address indexed addr)",
  "event BudgetReset(address indexed agent, uint256 previousSpent)",
  "event FundsDeposited(address indexed agent, uint256 amount)",
  "event FundsWithdrawn(address indexed agent, uint256 amount)",
] as const;

export default {
  ESCROW_ABI,
  PAYMENT_CHANNEL_ABI,
  STEALTH_REGISTRY_ABI,
  STREAM_PAYMENT_ABI,
  AGENT_REGISTRY_ABI,
};
