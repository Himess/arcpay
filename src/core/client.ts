import {
  createPublicClient,
  createWalletClient,
  http,
  formatUnits,
  parseUnits,
  type PublicClient,
  type WalletClient,
  type Chain,
  type Transport,
  type Account,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { NETWORKS, type NetworkConfig } from './config';
import type { ArcPayConfig, TransactionResult, Address } from './types';
import { MicropaymentsModule } from '../modules/micropayments';
import { PaymasterModule } from '../modules/paymaster';
import { USYCModule } from '../modules/usyc';
import { BridgeModule } from '../modules/bridge';
import { GatewayModule } from '../modules/gateway';
import { FXModule } from '../modules/fx';
import { SignerRequiredError, NetworkError } from '../utils/errors';
import { validateAddress, validateAmount, validatePrivateKey } from '../utils/validation';
import { getTxUrl } from '../utils/explorer';
import { USDC_DECIMALS, ERC20_ABI } from '../utils/constants';
import { balanceCache } from '../utils/cache';
import { ContactManager, createContactManager } from '../modules/contacts';
import type { StorageAdapter } from '../modules/contacts';
import { TemplateManager, createTemplateManager } from '../modules/templates';
import { SplitManager, createSplitManager } from '../modules/split';
import { PaymentLinkManager, createLinkManager } from '../modules/links';
import { PaymentRequestManager, createRequestManager } from '../modules/requests';

/**
 * Define Arc chain for viem
 */
function createArcChain(network: NetworkConfig): Chain {
  return {
    id: network.chainId,
    name: network.name,
    nativeCurrency: {
      name: 'USDC',
      symbol: 'USDC',
      decimals: 18, // Native USDC uses 18 decimals for gas
    },
    rpcUrls: {
      default: { http: [network.rpcUrl] },
    },
    blockExplorers: {
      default: { name: 'ArcScan', url: network.explorerUrl },
    },
  };
}

/**
 * ArcPay - Unified SDK for Arc blockchain
 *
 * @example
 * ```typescript
 * // Read-only client
 * const arc = await ArcPay.init({ network: 'arc-testnet' });
 * const balance = await arc.getBalance('0x...');
 *
 * // Full client with signer
 * const arc = await ArcPay.init({
 *   network: 'arc-testnet',
 *   privateKey: process.env.PRIVATE_KEY,
 * });
 * await arc.sendUSDC('0x...', '10.00');
 * ```
 */
export class ArcPay {
  /** Network configuration */
  public readonly network: NetworkConfig;
  /** Viem public client for read operations */
  public readonly publicClient: PublicClient<Transport, Chain>;
  /** Viem wallet client for write operations (undefined if no signer) */
  public readonly walletClient?: WalletClient<Transport, Chain, Account>;
  /** Signer address */
  public readonly address?: Address;

  /** Micropayments module - x402 protocol */
  public readonly micropayments: MicropaymentsModule;
  /** Paymaster module - gas sponsorship */
  public readonly paymaster: PaymasterModule;
  /** USYC module - yield operations */
  public readonly usyc: USYCModule;
  /** Bridge module - cross-chain transfers */
  public readonly bridge: BridgeModule;
  /** Gateway module - unified balance */
  public readonly gateway: GatewayModule;
  /** FX module - stablecoin swaps */
  public readonly fx: FXModule;
  /** Contact manager - address aliases */
  public readonly contacts: ContactManager;
  /** Template manager - payment presets */
  public readonly templates: TemplateManager;
  /** Split manager - bill splitting */
  public readonly split: SplitManager;
  /** Payment link manager - shareable links */
  public readonly links: PaymentLinkManager;
  /** Payment request manager - request money */
  public readonly requests: PaymentRequestManager;

  private constructor(
    network: NetworkConfig,
    publicClient: PublicClient<Transport, Chain>,
    walletClient?: WalletClient<Transport, Chain, Account>,
    address?: Address,
    circleApiKey?: string,
    contactStorage?: StorageAdapter
  ) {
    this.network = network;
    this.publicClient = publicClient;
    this.walletClient = walletClient;
    this.address = address;

    // Initialize modules
    this.micropayments = new MicropaymentsModule(this);
    this.paymaster = new PaymasterModule(this);
    this.usyc = new USYCModule(this);
    this.bridge = new BridgeModule(this);
    this.gateway = new GatewayModule(this, circleApiKey);
    this.fx = new FXModule(this, { apiKey: circleApiKey });
    this.contacts = createContactManager({ storage: contactStorage, autoSave: true });

    // Initialize new managers with shared contact manager
    this.templates = createTemplateManager();
    this.templates.setContactManager(this.contacts);

    this.split = createSplitManager();
    this.split.setArcPay(this);
    this.split.setContactManager(this.contacts);

    this.links = createLinkManager();
    this.links.setArcPay(this);

    this.requests = createRequestManager();
    this.requests.setArcPay(this);
    this.requests.setContactManager(this.contacts);
  }

  /**
   * Initialize ArcPay client
   *
   * @param config - Client configuration
   * @returns Initialized ArcPay instance
   *
   * @example
   * ```typescript
   * const arc = await ArcPay.init({
   *   network: 'arc-testnet',
   *   privateKey: process.env.PRIVATE_KEY, // optional
   * });
   * ```
   */
  static async init(config: ArcPayConfig): Promise<ArcPay> {
    const network = NETWORKS[config.network];
    if (!network) {
      throw new NetworkError(
        `Unknown network: ${config.network}. Available: ${Object.keys(NETWORKS).join(', ')}`
      );
    }

    const rpcUrl = config.rpcUrl || network.rpcUrl;
    const chain = createArcChain({ ...network, rpcUrl });

    // Create public client
    const publicClient = createPublicClient({
      chain,
      transport: http(rpcUrl),
    });

    // Create wallet client if private key provided
    let walletClient: WalletClient<Transport, Chain, Account> | undefined;
    let address: Address | undefined;

    if (config.privateKey) {
      const normalizedKey = validatePrivateKey(config.privateKey);
      const account = privateKeyToAccount(normalizedKey);
      address = account.address;

      walletClient = createWalletClient({
        account,
        chain,
        transport: http(rpcUrl),
      });
    }

    const client = new ArcPay(network, publicClient, walletClient, address, config.circleApiKey, config.contactStorage);

    // Validate connection
    await client.validateConnection();

    return client;
  }

  /**
   * Validate network connection
   */
  private async validateConnection(): Promise<void> {
    try {
      const chainId = await this.publicClient.getChainId();
      if (chainId !== this.network.chainId) {
        throw new NetworkError(
          `Chain ID mismatch. Expected ${this.network.chainId}, got ${chainId}`
        );
      }
    } catch (error) {
      if (error instanceof NetworkError) throw error;
      throw new NetworkError('Failed to connect to Arc network', { cause: error });
    }
  }

  /**
   * Check if client has a signer
   */
  hasSigner(): boolean {
    return !!this.walletClient;
  }

  /**
   * Require signer for an operation
   */
  requireSigner(operation: string): void {
    if (!this.walletClient) {
      throw new SignerRequiredError(operation);
    }
  }

  /**
   * Get USDC balance for an address
   *
   * Uses caching to reduce RPC calls (5 second TTL by default).
   * Cache is automatically invalidated after transfers.
   *
   * @param address - Address to check (defaults to signer address)
   * @param skipCache - Skip cache and fetch fresh data
   * @returns Balance in human-readable format (e.g., "100.50")
   *
   * @example
   * ```typescript
   * const balance = await arc.getBalance(); // signer balance
   * const balance = await arc.getBalance('0x...'); // specific address
   * const fresh = await arc.getBalance('0x...', true); // skip cache
   * ```
   */
  async getBalance(address?: string, skipCache: boolean = false): Promise<string> {
    const addr = address ? validateAddress(address) : this.address;
    if (!addr) {
      throw new SignerRequiredError('getBalance without address parameter');
    }

    // Check cache first (unless skip requested)
    if (!skipCache) {
      const cached = balanceCache.getBalance(addr, 'USDC');
      if (cached !== undefined) {
        return cached;
      }
    }

    // Fetch from chain
    const balance = await this.publicClient.readContract({
      address: this.network.usdc as Address,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [addr],
    });

    const formatted = formatUnits(balance as bigint, USDC_DECIMALS);

    // Cache the result
    balanceCache.setBalance(addr, formatted, 'USDC');

    return formatted;
  }

  /**
   * Get EURC balance for an address
   *
   * @param address - Address to check (defaults to signer address)
   * @returns Balance in human-readable format
   */
  async getEURCBalance(address?: string): Promise<string> {
    if (!this.network.eurc) {
      throw new NetworkError('EURC not available on this network');
    }

    const addr = address ? validateAddress(address) : this.address;
    if (!addr) {
      throw new SignerRequiredError('getEURCBalance without address parameter');
    }

    const balance = await this.publicClient.readContract({
      address: this.network.eurc as Address,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [addr],
    });

    return formatUnits(balance as bigint, USDC_DECIMALS);
  }

  /**
   * Send USDC to an address
   *
   * @param to - Recipient address
   * @param amount - Amount in human-readable format (e.g., "10.50")
   * @returns Transaction result
   *
   * @example
   * ```typescript
   * const result = await arc.sendUSDC('0x...', '10.00');
   * console.log(`Sent! ${result.explorerUrl}`);
   * ```
   */
  async sendUSDC(to: string, amount: string): Promise<TransactionResult> {
    this.requireSigner('sendUSDC');
    const toAddress = validateAddress(to, 'recipient');
    validateAmount(amount);

    try {
      const value = parseUnits(amount, USDC_DECIMALS);

      const hash = await this.walletClient!.writeContract({
        address: this.network.usdc as Address,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [toAddress, value],
      });

      // Wait for confirmation
      await this.publicClient.waitForTransactionReceipt({ hash });

      // Invalidate balance cache for both sender and recipient
      if (this.address) {
        balanceCache.invalidateAddress(this.address);
      }
      balanceCache.invalidateAddress(toAddress);

      return {
        success: true,
        txHash: hash,
        explorerUrl: getTxUrl(this.network, hash),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed',
      };
    }
  }

  /**
   * Transfer USDC to an address or contact name
   * Auto-resolves contact names to addresses
   *
   * @param to - Recipient address OR contact name (e.g., "0x..." or "ahmed")
   * @param amount - Amount in human-readable format (e.g., "10.50")
   * @returns Transaction result
   *
   * @example
   * ```typescript
   * // By address
   * const result = await arc.transfer({ to: '0x...', amount: '10.00' });
   *
   * // By contact name
   * await arc.contacts.add('ahmed', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78');
   * const result = await arc.transfer({ to: 'ahmed', amount: '50.00' });
   * ```
   */
  async transfer(params: { to: string; amount: string }): Promise<TransactionResult> {
    // Resolve contact name to address
    const resolvedTo = await this.contacts.resolve(params.to);

    if (!resolvedTo) {
      return {
        success: false,
        error: `Unknown recipient: "${params.to}". Add as contact first with arc.contacts.add()`,
      };
    }

    // Record payment if it was a contact
    const contact = await this.contacts.get(params.to);
    const result = await this.sendUSDC(resolvedTo, params.amount);

    // Record payment to contact for tracking
    if (result.success && contact) {
      try {
        // Auto-mark subscriptions as paid (updates nextDueDate)
        if (contact.metadata.category === 'subscription' && result.txHash) {
          await this.contacts.markPaid(params.to, result.txHash);
        } else {
          await this.contacts.recordPayment(params.to, params.amount, result.txHash);
        }
      } catch {
        // Ignore tracking errors
      }
    }

    return result;
  }

  /**
   * Send EURC to an address
   *
   * @param to - Recipient address
   * @param amount - Amount in human-readable format
   * @returns Transaction result
   */
  async sendEURC(to: string, amount: string): Promise<TransactionResult> {
    if (!this.network.eurc) {
      return { success: false, error: 'EURC not available on this network' };
    }

    this.requireSigner('sendEURC');
    const toAddress = validateAddress(to, 'recipient');
    validateAmount(amount);

    try {
      const value = parseUnits(amount, USDC_DECIMALS);

      const hash = await this.walletClient!.writeContract({
        address: this.network.eurc as Address,
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [toAddress, value],
      });

      await this.publicClient.waitForTransactionReceipt({ hash });

      return {
        success: true,
        txHash: hash,
        explorerUrl: getTxUrl(this.network, hash),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Transaction failed',
      };
    }
  }

  /**
   * Get explorer URL for a transaction
   *
   * @param txHash - Transaction hash
   * @returns Explorer URL
   */
  getExplorerUrl(txHash: string): string {
    return getTxUrl(this.network, txHash);
  }

  /**
   * Get faucet URL for testnet
   *
   * @returns Faucet URL or undefined if not available
   */
  getFaucetUrl(): string | undefined {
    return this.network.faucetUrl;
  }
}

/**
 * ArcPayClient - Simplified client for Agent and Simple API modules
 *
 * Provides a simpler, synchronous-looking interface for common operations.
 * Internally uses lazy initialization of ArcPay.
 */
export class ArcPayClient {
  private readonly config: { network: 'arc-testnet' | 'arc-mainnet'; privateKey: string };
  private arcPay?: ArcPay;
  private initPromise?: Promise<ArcPay>;

  constructor(config: { network: 'arc-testnet' | 'arc-mainnet'; privateKey: string }) {
    this.config = config;
  }

  private async getClient(): Promise<ArcPay> {
    if (this.arcPay) return this.arcPay;
    if (this.initPromise) return this.initPromise;

    this.initPromise = ArcPay.init({
      network: this.config.network,
      privateKey: this.config.privateKey,
    });

    this.arcPay = await this.initPromise;
    return this.arcPay;
  }

  /**
   * Transfer USDC to an address
   */
  async transfer(params: { to: string; amount: string }): Promise<{ txHash: string; success: boolean }> {
    const client = await this.getClient();
    const result = await client.sendUSDC(params.to, params.amount);
    return {
      txHash: result.txHash || '',
      success: result.success,
    };
  }

  /**
   * Get USDC balance and address
   */
  async getBalance(): Promise<{ usdc: string; address: string }> {
    const client = await this.getClient();
    const balance = await client.getBalance();
    return {
      usdc: balance,
      address: client.address || '',
    };
  }
}
