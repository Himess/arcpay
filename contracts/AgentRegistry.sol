// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title AgentRegistry
 * @notice On-chain registry for AI agent budget management
 * @dev Enables trustless budget enforcement for autonomous AI agents
 *
 * Features:
 * - Daily budget limits per agent
 * - Per-transaction limits
 * - Whitelist/blacklist enforcement
 * - Emergency stop by owner
 * - Automatic daily budget reset
 *
 * Arc Testnet Compatibility:
 * - Supports NATIVE USDC deposits via depositFundsNative() (payable)
 * - Arc uses USDC as the native gas token (like ETH on Ethereum)
 * - ERC20 functions (depositFunds) kept for compatibility with wrapped tokens
 */
contract AgentRegistry is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Structs ============

    struct AgentConfig {
        address owner;              // Agent's owner (human)
        uint256 dailyBudget;        // Max daily spending (USDC, 6 decimals)
        uint256 perTxLimit;         // Per-transaction limit
        uint256 todaySpent;         // Today's spending
        uint256 lastResetTimestamp; // Last reset timestamp
        bool active;                // Agent active status
    }

    // ============ State ============

    IERC20 public immutable usdc;

    mapping(address => AgentConfig) public agents;
    mapping(address => mapping(address => bool)) public whitelist;
    mapping(address => mapping(address => bool)) public blacklist;
    mapping(address => address[]) public whitelistArray;
    mapping(address => address[]) public blacklistArray;
    mapping(address => uint256) public agentBalances;

    // ============ Events ============

    event AgentRegistered(
        address indexed agent,
        address indexed owner,
        uint256 dailyBudget,
        uint256 perTxLimit
    );
    event AgentUpdated(address indexed agent, uint256 newDailyBudget, uint256 newPerTxLimit);
    event AgentDeactivated(address indexed agent);
    event AgentReactivated(address indexed agent);

    event PaymentExecuted(
        address indexed agent,
        address indexed recipient,
        uint256 amount,
        string memo
    );
    event PaymentBlocked(
        address indexed agent,
        address indexed recipient,
        uint256 amount,
        string reason
    );

    event AddedToWhitelist(address indexed agent, address indexed addr);
    event RemovedFromWhitelist(address indexed agent, address indexed addr);
    event AddedToBlacklist(address indexed agent, address indexed addr);
    event RemovedFromBlacklist(address indexed agent, address indexed addr);

    event BudgetReset(address indexed agent, uint256 previousSpent);
    event FundsDeposited(address indexed agent, uint256 amount);
    event FundsWithdrawn(address indexed agent, uint256 amount);

    // ============ Errors ============

    error NotAgentOwner();
    error AgentNotActive();
    error AgentAlreadyExists();
    error AgentNotFound();
    error RecipientBlacklisted();
    error RecipientNotWhitelisted();
    error DailyBudgetExceeded(uint256 requested, uint256 remaining);
    error PerTxLimitExceeded(uint256 requested, uint256 limit);
    error InsufficientBalance(uint256 requested, uint256 available);
    error InvalidAmount();
    error InvalidAddress();

    // ============ Modifiers ============

    modifier onlyAgentOwner(address agent) {
        if (agents[agent].owner != msg.sender) revert NotAgentOwner();
        _;
    }

    modifier onlyActiveAgent(address agent) {
        if (!agents[agent].active) revert AgentNotActive();
        _;
    }

    // ============ Constructor ============

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
    }

    // ============ Agent Management ============

    /// @notice Register a new agent with budget limits
    /// @param agent The agent's wallet address
    /// @param dailyBudget Maximum daily spending (USDC with 6 decimals)
    /// @param perTxLimit Maximum per-transaction limit
    function registerAgent(
        address agent,
        uint256 dailyBudget,
        uint256 perTxLimit
    ) external {
        if (agent == address(0)) revert InvalidAddress();
        if (agents[agent].owner != address(0)) revert AgentAlreadyExists();

        agents[agent] = AgentConfig({
            owner: msg.sender,
            dailyBudget: dailyBudget,
            perTxLimit: perTxLimit,
            todaySpent: 0,
            lastResetTimestamp: block.timestamp,
            active: true
        });

        emit AgentRegistered(agent, msg.sender, dailyBudget, perTxLimit);
    }

    /// @notice Update agent budget limits
    function updateAgent(
        address agent,
        uint256 newDailyBudget,
        uint256 newPerTxLimit
    ) external onlyAgentOwner(agent) {
        agents[agent].dailyBudget = newDailyBudget;
        agents[agent].perTxLimit = newPerTxLimit;
        emit AgentUpdated(agent, newDailyBudget, newPerTxLimit);
    }

    /// @notice Deactivate an agent (emergency stop)
    function deactivateAgent(address agent) external onlyAgentOwner(agent) {
        agents[agent].active = false;
        emit AgentDeactivated(agent);
    }

    /// @notice Reactivate a deactivated agent
    function reactivateAgent(address agent) external onlyAgentOwner(agent) {
        agents[agent].active = true;
        emit AgentReactivated(agent);
    }

    // ============ Whitelist/Blacklist ============

    function addToWhitelist(address agent, address addr) external onlyAgentOwner(agent) {
        if (!whitelist[agent][addr]) {
            whitelist[agent][addr] = true;
            whitelistArray[agent].push(addr);
            emit AddedToWhitelist(agent, addr);
        }
    }

    function removeFromWhitelist(address agent, address addr) external onlyAgentOwner(agent) {
        if (whitelist[agent][addr]) {
            whitelist[agent][addr] = false;
            emit RemovedFromWhitelist(agent, addr);
        }
    }

    function addToBlacklist(address agent, address addr) external onlyAgentOwner(agent) {
        if (!blacklist[agent][addr]) {
            blacklist[agent][addr] = true;
            blacklistArray[agent].push(addr);
            emit AddedToBlacklist(agent, addr);
        }
    }

    function removeFromBlacklist(address agent, address addr) external onlyAgentOwner(agent) {
        if (blacklist[agent][addr]) {
            blacklist[agent][addr] = false;
            emit RemovedFromBlacklist(agent, addr);
        }
    }

    // ============ Payment Execution ============

    /// @notice Execute a payment from agent's deposited funds
    /// @dev Only the agent itself can call this (agent's private key signs tx)
    function executePayment(
        address recipient,
        uint256 amount,
        string calldata memo
    ) external nonReentrant onlyActiveAgent(msg.sender) {
        if (amount == 0) revert InvalidAmount();
        if (recipient == address(0)) revert InvalidAddress();

        AgentConfig storage config = agents[msg.sender];

        // 1. Blacklist check
        if (blacklist[msg.sender][recipient]) {
            emit PaymentBlocked(msg.sender, recipient, amount, "BLACKLISTED");
            revert RecipientBlacklisted();
        }

        // 2. Whitelist check (if whitelist has entries)
        if (whitelistArray[msg.sender].length > 0 && !whitelist[msg.sender][recipient]) {
            emit PaymentBlocked(msg.sender, recipient, amount, "NOT_WHITELISTED");
            revert RecipientNotWhitelisted();
        }

        // 3. Reset daily budget if new day
        _resetDailyBudgetIfNeeded(msg.sender);

        // 4. Per-transaction limit check
        if (amount > config.perTxLimit) {
            emit PaymentBlocked(msg.sender, recipient, amount, "PER_TX_LIMIT");
            revert PerTxLimitExceeded(amount, config.perTxLimit);
        }

        // 5. Daily budget check
        uint256 remaining = config.dailyBudget - config.todaySpent;
        if (amount > remaining) {
            emit PaymentBlocked(msg.sender, recipient, amount, "DAILY_BUDGET");
            revert DailyBudgetExceeded(amount, remaining);
        }

        // 6. Balance check (use agent's deposited balance)
        uint256 balance = agentBalances[msg.sender];
        if (amount > balance) {
            emit PaymentBlocked(msg.sender, recipient, amount, "INSUFFICIENT_BALANCE");
            revert InsufficientBalance(amount, balance);
        }

        // 7. Update spent amount
        config.todaySpent += amount;

        // 8. Deduct from agent balance and transfer native USDC
        agentBalances[msg.sender] -= amount;

        // Transfer native USDC (Arc Testnet compatible)
        (bool success, ) = payable(recipient).call{value: amount}("");
        require(success, "Native transfer failed");

        emit PaymentExecuted(msg.sender, recipient, amount, memo);
    }

    // ============ Fund Management ============

    /// @notice Deposit ERC20 USDC for agent to use (for wrapped tokens)
    /// @dev Use depositFundsNative() for Arc Testnet native USDC
    function depositFunds(address agent, uint256 amount) external {
        if (agents[agent].owner == address(0)) revert AgentNotFound();
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        agentBalances[agent] += amount;
        emit FundsDeposited(agent, amount);
    }

    /// @notice Deposit NATIVE USDC for agent to use (Arc Testnet compatible)
    /// @dev On Arc, USDC is the native gas token - use this function for deposits
    function depositFundsNative(address agent) external payable {
        if (agents[agent].owner == address(0)) revert AgentNotFound();
        if (msg.value == 0) revert InvalidAmount();
        agentBalances[agent] += msg.value;
        emit FundsDeposited(agent, msg.value);
    }

    /// @notice Withdraw unused funds (owner only) - Native USDC version
    /// @dev Transfers native USDC back to owner
    function withdrawFunds(address agent, uint256 amount) external onlyAgentOwner(agent) nonReentrant {
        if (amount > agentBalances[agent]) revert InsufficientBalance(amount, agentBalances[agent]);
        agentBalances[agent] -= amount;

        // Transfer native USDC
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Native transfer failed");

        emit FundsWithdrawn(agent, amount);
    }

    /// @notice Receive native USDC deposits (fallback for direct transfers)
    receive() external payable {
        // Direct transfers go to the sender's agent balance if registered
        if (agents[msg.sender].owner != address(0)) {
            agentBalances[msg.sender] += msg.value;
            emit FundsDeposited(msg.sender, msg.value);
        }
        // Otherwise just accept the payment (can be withdrawn by contract admin)
    }

    // ============ View Functions ============

    function getAgentConfig(address agent) external view returns (AgentConfig memory) {
        return agents[agent];
    }

    function getAgentBalance(address agent) external view returns (uint256) {
        return agentBalances[agent];
    }

    function getRemainingDailyBudget(address agent) external view returns (uint256) {
        AgentConfig storage config = agents[agent];
        if (_isNewDay(config.lastResetTimestamp)) {
            return config.dailyBudget;
        }
        return config.dailyBudget - config.todaySpent;
    }

    function isWhitelisted(address agent, address addr) external view returns (bool) {
        return whitelist[agent][addr];
    }

    function isBlacklisted(address agent, address addr) external view returns (bool) {
        return blacklist[agent][addr];
    }

    function getWhitelist(address agent) external view returns (address[] memory) {
        return whitelistArray[agent];
    }

    function getBlacklist(address agent) external view returns (address[] memory) {
        return blacklistArray[agent];
    }

    // ============ Internal Functions ============

    function _resetDailyBudgetIfNeeded(address agent) internal {
        AgentConfig storage config = agents[agent];
        if (_isNewDay(config.lastResetTimestamp)) {
            emit BudgetReset(agent, config.todaySpent);
            config.todaySpent = 0;
            config.lastResetTimestamp = block.timestamp;
        }
    }

    function _isNewDay(uint256 lastReset) internal view returns (bool) {
        return block.timestamp / 1 days > lastReset / 1 days;
    }
}
