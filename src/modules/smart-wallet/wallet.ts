/**
 * Smart Wallet - ERC-4337 Account Abstraction
 */

import {
  createPublicClient,
  http,
  encodeFunctionData,
  keccak256,
  concat,
  pad,
  toHex,
  parseEther,
  formatEther,
  type Chain,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import type {
  SmartWalletConfig,
  SmartWalletInfo,
  UserOperation,
  UserOperationResult,
  BatchOperation,
  SmartWalletTxOptions,
  SessionKeyConfig,
  SessionKeyInfo,
  RecoveryConfig,
  RecoveryRequest,
  PaymasterData,
} from './types';

/**
 * Arc testnet chain configuration
 */
const arcTestnet: Chain = {
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
  },
};

// Default addresses (would be deployed on Arc)
const DEFAULT_ENTRY_POINT = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';
const DEFAULT_FACTORY = '0x9406Cc6185a346906296840746125a0E44976454';

// Simple Account ABI fragments
const ACCOUNT_ABI = [
  {
    name: 'execute',
    type: 'function',
    inputs: [
      { name: 'dest', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'func', type: 'bytes' },
    ],
    outputs: [],
  },
  {
    name: 'executeBatch',
    type: 'function',
    inputs: [
      { name: 'dest', type: 'address[]' },
      { name: 'value', type: 'uint256[]' },
      { name: 'func', type: 'bytes[]' },
    ],
    outputs: [],
  },
  {
    name: 'getNonce',
    type: 'function',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
] as const;

const FACTORY_ABI = [
  {
    name: 'createAccount',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'salt', type: 'uint256' },
    ],
    outputs: [{ type: 'address' }],
  },
  {
    name: 'getAddress',
    type: 'function',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'salt', type: 'uint256' },
    ],
    outputs: [{ type: 'address' }],
  },
] as const;

/**
 * Smart Wallet with ERC-4337 Account Abstraction
 *
 * Features:
 * - Gasless transactions via paymasters
 * - Batch operations
 * - Session keys for delegated access
 * - Social recovery
 */
export class SmartWallet {
  private ownerAccount: ReturnType<typeof privateKeyToAccount>;
  private publicClient: ReturnType<typeof createPublicClient>;
  private config: SmartWalletConfig;
  private walletAddress?: string;
  private sessionKeys: Map<string, SessionKeyInfo> = new Map();
  private recoveryConfig?: RecoveryConfig;
  private recoveryRequests: Map<string, RecoveryRequest> = new Map();

  constructor(config: SmartWalletConfig) {
    this.config = {
      entryPoint: DEFAULT_ENTRY_POINT,
      factory: DEFAULT_FACTORY,
      salt: '0',
      ...config,
    };

    this.ownerAccount = privateKeyToAccount(config.ownerKey as `0x${string}`);

    this.publicClient = createPublicClient({
      chain: arcTestnet,
      transport: http(),
    });
  }

  /**
   * Initialize the smart wallet
   *
   * @returns Smart wallet address
   */
  async init(): Promise<string> {
    this.walletAddress = await this.getAddress();
    return this.walletAddress;
  }

  /**
   * Get smart wallet address (counterfactual)
   *
   * @returns Wallet address
   */
  async getAddress(): Promise<string> {
    if (this.walletAddress) return this.walletAddress;

    // Calculate counterfactual address
    const salt = BigInt(this.config.salt || '0');

    try {
      const address = await this.publicClient.readContract({
        address: this.config.factory as `0x${string}`,
        abi: FACTORY_ABI,
        functionName: 'getAddress',
        args: [this.ownerAccount.address, salt],
      });
      return address as string;
    } catch {
      // If factory doesn't exist, compute address locally
      return this.computeAddress();
    }
  }

  /**
   * Get wallet info
   *
   * @returns Wallet info
   */
  async getInfo(): Promise<SmartWalletInfo> {
    const address = await this.getAddress();
    const isDeployed = await this.isDeployed();

    let nonce = '0';
    let balance = '0';

    if (isDeployed) {
      try {
        const nonceResult = (await this.publicClient.readContract({
          address: address as `0x${string}`,
          abi: ACCOUNT_ABI,
          functionName: 'getNonce',
        })) as bigint;
        nonce = nonceResult.toString();
      } catch {
        // Default nonce
      }
    }

    try {
      const balanceResult = await this.publicClient.getBalance({
        address: address as `0x${string}`,
      });
      balance = formatEther(balanceResult);
    } catch {
      // Default balance
    }

    return {
      address,
      owner: this.ownerAccount.address,
      isDeployed,
      nonce,
      balance,
    };
  }

  /**
   * Check if wallet is deployed
   *
   * @returns Whether deployed
   */
  async isDeployed(): Promise<boolean> {
    const address = await this.getAddress();
    const code = await this.publicClient.getBytecode({
      address: address as `0x${string}`,
    });
    return code !== undefined && code !== '0x';
  }

  /**
   * Execute a single transaction
   *
   * @param to - Target address
   * @param value - Value to send
   * @param data - Call data
   * @param options - Transaction options
   * @returns Operation result
   */
  async execute(
    to: string,
    value: string,
    data: string,
    options?: SmartWalletTxOptions
  ): Promise<UserOperationResult> {
    const callData = encodeFunctionData({
      abi: ACCOUNT_ABI,
      functionName: 'execute',
      args: [to as `0x${string}`, parseEther(value), data as `0x${string}`],
    });

    return this.sendUserOperation(callData, options);
  }

  /**
   * Execute batch transactions
   *
   * @param operations - Batch operations
   * @param options - Transaction options
   * @returns Operation result
   */
  async executeBatch(
    operations: BatchOperation[],
    options?: SmartWalletTxOptions
  ): Promise<UserOperationResult> {
    const destinations = operations.map((op) => op.to as `0x${string}`);
    const values = operations.map((op) => parseEther(op.value));
    const datas = operations.map((op) => op.data as `0x${string}`);

    const callData = encodeFunctionData({
      abi: ACCOUNT_ABI,
      functionName: 'executeBatch',
      args: [destinations, values, datas],
    });

    return this.sendUserOperation(callData, options);
  }

  /**
   * Send USDC
   *
   * @param to - Recipient address
   * @param amount - Amount to send
   * @param options - Transaction options
   * @returns Operation result
   */
  async sendUSDC(
    to: string,
    amount: string,
    options?: SmartWalletTxOptions
  ): Promise<UserOperationResult> {
    // ERC20 transfer call data
    const transferData = encodeFunctionData({
      abi: [
        {
          name: 'transfer',
          type: 'function',
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
          outputs: [{ type: 'bool' }],
        },
      ],
      functionName: 'transfer',
      args: [to as `0x${string}`, parseEther(amount)],
    });

    const USDC_ADDRESS = '0x3600000000000000000000000000000000000000';

    return this.execute(USDC_ADDRESS, '0', transferData, options);
  }

  /**
   * Add a session key
   *
   * @param config - Session key configuration
   * @returns Session key info
   */
  async addSessionKey(config: SessionKeyConfig): Promise<SessionKeyInfo> {
    const sessionInfo: SessionKeyInfo = {
      ...config,
      isActive: true,
      amountSpent: '0',
      txCount: 0,
    };

    this.sessionKeys.set(config.sessionKey.toLowerCase(), sessionInfo);

    // In production, this would also call the smart contract to register the session key
    return sessionInfo;
  }

  /**
   * Revoke a session key
   *
   * @param sessionKey - Session key address
   */
  async revokeSessionKey(sessionKey: string): Promise<void> {
    const info = this.sessionKeys.get(sessionKey.toLowerCase());
    if (info) {
      info.isActive = false;
      this.sessionKeys.set(sessionKey.toLowerCase(), info);
    }

    // In production, this would also call the smart contract
  }

  /**
   * Get session key info
   *
   * @param sessionKey - Session key address
   * @returns Session key info
   */
  getSessionKeyInfo(sessionKey: string): SessionKeyInfo | undefined {
    return this.sessionKeys.get(sessionKey.toLowerCase());
  }

  /**
   * Get all session keys
   *
   * @returns All session key infos
   */
  getAllSessionKeys(): SessionKeyInfo[] {
    return Array.from(this.sessionKeys.values());
  }

  /**
   * Execute with session key
   *
   * @param sessionKey - Session key private key
   * @param to - Target address
   * @param value - Value to send
   * @param data - Call data
   * @returns Operation result
   */
  async executeWithSessionKey(
    sessionKey: string,
    to: string,
    value: string,
    data: string
  ): Promise<UserOperationResult> {
    const sessionAccount = privateKeyToAccount(sessionKey as `0x${string}`);
    const sessionInfo = this.sessionKeys.get(sessionAccount.address.toLowerCase());

    if (!sessionInfo || !sessionInfo.isActive) {
      return {
        userOpHash: '',
        success: false,
        reason: 'Session key not found or inactive',
      };
    }

    // Check validity period
    const now = Math.floor(Date.now() / 1000);
    if (now < sessionInfo.validAfter || now > sessionInfo.validUntil) {
      return {
        userOpHash: '',
        success: false,
        reason: 'Session key expired or not yet valid',
      };
    }

    // Check allowed targets
    if (
      sessionInfo.allowedTargets.length > 0 &&
      !sessionInfo.allowedTargets.some((t) => t.toLowerCase() === to.toLowerCase())
    ) {
      return {
        userOpHash: '',
        success: false,
        reason: 'Target not allowed for this session key',
      };
    }

    // Check spending limit
    if (sessionInfo.spendingLimit && parseEther(value) > parseEther(sessionInfo.spendingLimit)) {
      return {
        userOpHash: '',
        success: false,
        reason: 'Transaction exceeds session key spending limit',
      };
    }

    // Execute (simplified - in production would use session key signature)
    const result = await this.execute(to, value, data);

    // Update session stats
    if (result.success) {
      sessionInfo.amountSpent = (
        parseEther(sessionInfo.amountSpent) + parseEther(value)
      ).toString();
      sessionInfo.txCount++;
      this.sessionKeys.set(sessionAccount.address.toLowerCase(), sessionInfo);
    }

    return result;
  }

  /**
   * Setup social recovery
   *
   * @param config - Recovery configuration
   */
  async setupRecovery(config: RecoveryConfig): Promise<void> {
    if (config.threshold > config.guardians.length) {
      throw new Error('Threshold cannot exceed number of guardians');
    }
    if (config.threshold === 0) {
      throw new Error('Threshold must be at least 1');
    }

    this.recoveryConfig = config;

    // In production, this would call the smart contract
  }

  /**
   * Initiate recovery
   *
   * @param newOwner - New owner address
   * @param guardianSignature - Guardian signature initiating recovery
   * @returns Recovery request
   */
  async initiateRecovery(newOwner: string, guardianSignature: string): Promise<RecoveryRequest> {
    if (!this.recoveryConfig) {
      throw new Error('Recovery not configured');
    }

    const requestId = keccak256(
      concat([
        toHex(newOwner),
        toHex(Date.now()),
        toHex(Math.random().toString()),
      ])
    );

    const now = Math.floor(Date.now() / 1000);
    const request: RecoveryRequest = {
      id: requestId,
      newOwner,
      createdAt: now,
      executeAfter: now + this.recoveryConfig.delayPeriod,
      approvals: [guardianSignature],
      executed: false,
    };

    this.recoveryRequests.set(requestId, request);

    return request;
  }

  /**
   * Approve recovery request
   *
   * @param requestId - Recovery request ID
   * @param guardianSignature - Guardian signature
   * @returns Updated request
   */
  async approveRecovery(requestId: string, guardianSignature: string): Promise<RecoveryRequest> {
    const request = this.recoveryRequests.get(requestId);
    if (!request) {
      throw new Error('Recovery request not found');
    }

    if (request.executed) {
      throw new Error('Recovery already executed');
    }

    request.approvals.push(guardianSignature);
    this.recoveryRequests.set(requestId, request);

    return request;
  }

  /**
   * Execute recovery
   *
   * @param requestId - Recovery request ID
   * @returns Whether executed
   */
  async executeRecovery(requestId: string): Promise<boolean> {
    if (!this.recoveryConfig) {
      throw new Error('Recovery not configured');
    }

    const request = this.recoveryRequests.get(requestId);
    if (!request) {
      throw new Error('Recovery request not found');
    }

    if (request.executed) {
      throw new Error('Recovery already executed');
    }

    const now = Math.floor(Date.now() / 1000);
    if (now < request.executeAfter) {
      throw new Error('Recovery delay period not elapsed');
    }

    if (request.approvals.length < this.recoveryConfig.threshold) {
      throw new Error('Insufficient guardian approvals');
    }

    // In production, this would call the smart contract to transfer ownership
    request.executed = true;
    this.recoveryRequests.set(requestId, request);

    return true;
  }

  /**
   * Get recovery status
   *
   * @param requestId - Recovery request ID
   * @returns Recovery request status
   */
  getRecoveryStatus(requestId: string): RecoveryRequest | undefined {
    return this.recoveryRequests.get(requestId);
  }

  /**
   * Get paymaster data for sponsored transaction
   *
   * @param userOp - User operation
   * @returns Paymaster data
   */
  async getPaymasterData(userOp: Partial<UserOperation>): Promise<PaymasterData | null> {
    if (!this.config.paymasterUrl) {
      return null;
    }

    try {
      const response = await fetch(this.config.paymasterUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'pm_sponsorUserOperation',
          params: [userOp, this.config.entryPoint],
          id: 1,
        }),
      });

      const result = (await response.json()) as {
        result?: { paymaster: string; paymasterAndData: string };
      };
      if (result.result) {
        return {
          address: result.result.paymaster,
          type: 'verifying' as const,
          data: result.result.paymasterAndData,
        };
      }
    } catch {
      // Return null if paymaster unavailable
    }

    return null;
  }

  // Private methods

  private async sendUserOperation(
    callData: string,
    options?: SmartWalletTxOptions
  ): Promise<UserOperationResult> {
    const address = await this.getAddress();
    const isDeployed = await this.isDeployed();

    // Build user operation
    const userOp: UserOperation = {
      sender: address,
      nonce: await this.getNonce(),
      initCode: isDeployed ? '0x' : await this.getInitCode(),
      callData,
      callGasLimit: options?.gasLimit || '200000',
      verificationGasLimit: isDeployed ? '100000' : '500000',
      preVerificationGas: '50000',
      maxFeePerGas: '1000000000', // 1 gwei
      maxPriorityFeePerGas: options?.priorityFee || '100000000', // 0.1 gwei
      paymasterAndData: '0x',
      signature: '0x',
    };

    // Get paymaster data if sponsored
    if (options?.sponsored) {
      const paymasterData = await this.getPaymasterData(userOp);
      if (paymasterData?.data) {
        userOp.paymasterAndData = paymasterData.data;
      }
    }

    // Sign user operation
    userOp.signature = await this.signUserOperation(userOp);

    // Send to bundler
    return this.submitToBundler(userOp);
  }

  private async getNonce(): Promise<string> {
    const address = await this.getAddress();
    const isDeployed = await this.isDeployed();

    if (!isDeployed) return '0';

    try {
      const nonce = (await this.publicClient.readContract({
        address: address as `0x${string}`,
        abi: ACCOUNT_ABI,
        functionName: 'getNonce',
      })) as bigint;
      return nonce.toString();
    } catch {
      return '0';
    }
  }

  private async getInitCode(): Promise<string> {
    const salt = BigInt(this.config.salt || '0');

    const initCallData = encodeFunctionData({
      abi: FACTORY_ABI,
      functionName: 'createAccount',
      args: [this.ownerAccount.address, salt],
    });

    return concat([this.config.factory as `0x${string}`, initCallData]);
  }

  private async signUserOperation(userOp: UserOperation): Promise<string> {
    const userOpHash = this.getUserOperationHash(userOp);
    const signature = await this.ownerAccount.signMessage({
      message: { raw: userOpHash as `0x${string}` },
    });
    return signature;
  }

  private getUserOperationHash(userOp: UserOperation): string {
    // Simplified hash calculation
    const packed = concat([
      userOp.sender as `0x${string}`,
      pad(toHex(BigInt(userOp.nonce)), { size: 32 }),
      keccak256(userOp.initCode as `0x${string}`),
      keccak256(userOp.callData as `0x${string}`),
      pad(toHex(BigInt(userOp.callGasLimit)), { size: 32 }),
      pad(toHex(BigInt(userOp.verificationGasLimit)), { size: 32 }),
      pad(toHex(BigInt(userOp.preVerificationGas)), { size: 32 }),
      pad(toHex(BigInt(userOp.maxFeePerGas)), { size: 32 }),
      pad(toHex(BigInt(userOp.maxPriorityFeePerGas)), { size: 32 }),
      keccak256(userOp.paymasterAndData as `0x${string}`),
    ]);

    const hash = keccak256(packed);

    // Hash with entry point and chain id
    return keccak256(
      concat([hash, pad(this.config.entryPoint as `0x${string}`, { size: 32 }), pad(toHex(arcTestnet.id), { size: 32 })])
    );
  }

  private async submitToBundler(userOp: UserOperation): Promise<UserOperationResult> {
    const bundlerUrl = this.config.bundlerUrl || 'https://bundler.arc.network';

    try {
      const response = await fetch(bundlerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_sendUserOperation',
          params: [userOp, this.config.entryPoint],
          id: 1,
        }),
      });

      const result = (await response.json()) as {
        error?: { message: string };
        result?: string;
      };

      if (result.error) {
        return {
          userOpHash: '',
          success: false,
          reason: result.error.message,
        };
      }

      const userOpHash = result.result || '';

      // Wait for receipt
      const receipt = await this.waitForReceipt(userOpHash);

      return {
        userOpHash,
        txHash: receipt?.transactionHash,
        success: receipt?.success ?? false,
        actualGasUsed: receipt?.actualGasUsed,
      };
    } catch (error) {
      return {
        userOpHash: '',
        success: false,
        reason: error instanceof Error ? error.message : 'Bundler request failed',
      };
    }
  }

  private async waitForReceipt(
    userOpHash: string,
    timeout: number = 60000
  ): Promise<{ transactionHash: string; success: boolean; actualGasUsed: string } | null> {
    const bundlerUrl = this.config.bundlerUrl || 'https://bundler.arc.network';
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(bundlerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getUserOperationReceipt',
            params: [userOpHash],
            id: 1,
          }),
        });

        const result = (await response.json()) as {
          result?: {
            receipt: { transactionHash: string };
            success: boolean;
            actualGasUsed: string;
          };
        };

        if (result.result) {
          return {
            transactionHash: result.result.receipt.transactionHash,
            success: result.result.success,
            actualGasUsed: result.result.actualGasUsed,
          };
        }
      } catch {
        // Continue polling
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return null;
  }

  private computeAddress(): string {
    // Simplified counterfactual address computation
    const salt = BigInt(this.config.salt || '0');
    const hash = keccak256(
      concat([
        '0xff' as `0x${string}`,
        this.config.factory as `0x${string}`,
        pad(toHex(salt), { size: 32 }),
        keccak256(
          concat([
            '0x' as `0x${string}`, // init code hash placeholder
            this.ownerAccount.address,
          ])
        ),
      ])
    );

    return `0x${hash.slice(-40)}`;
  }
}

/**
 * Create a smart wallet instance
 *
 * @param config - Wallet configuration
 * @returns SmartWallet instance
 *
 * @example
 * ```typescript
 * const wallet = await createSmartWallet({
 *   ownerKey: process.env.OWNER_KEY,
 *   paymasterUrl: 'https://paymaster.arc.network',
 * });
 *
 * await wallet.init();
 * console.log('Smart wallet:', await wallet.getAddress());
 *
 * // Send sponsored transaction
 * const result = await wallet.sendUSDC('0x...', '10.00', { sponsored: true });
 *
 * // Batch operations
 * await wallet.executeBatch([
 *   { to: '0x...', value: '0', data: '0x...' },
 *   { to: '0x...', value: '0', data: '0x...' },
 * ]);
 *
 * // Session keys
 * await wallet.addSessionKey({
 *   sessionKey: '0x...',
 *   validUntil: Date.now() / 1000 + 86400,
 *   validAfter: Date.now() / 1000,
 *   allowedTargets: ['0x...'],
 *   allowedSelectors: [],
 *   spendingLimit: '100',
 * });
 * ```
 */
export async function createSmartWallet(config: SmartWalletConfig): Promise<SmartWallet> {
  const wallet = new SmartWallet(config);
  await wallet.init();
  return wallet;
}
