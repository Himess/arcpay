import { NextRequest, NextResponse } from 'next/server';
import { createWalletClient, createPublicClient, http, parseUnits, defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Arc Testnet configuration
const ARC_TESTNET = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.testnet.arc.network'] },
  },
});

const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x3600000000000000000000000000000000000000') as `0x${string}`;

const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
] as const;

export async function POST(request: NextRequest) {
  try {
    const { to, amount } = await request.json();

    // Validate inputs
    if (!to || !amount) {
      return NextResponse.json({ error: 'Missing required fields: to, amount' }, { status: 400 });
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(to)) {
      return NextResponse.json({ error: 'Invalid recipient address' }, { status: 400 });
    }

    // Validate amount
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    // Check for private key - required for real onchain transactions
    const privateKey = process.env.DEMO_PRIVATE_KEY;
    if (!privateKey) {
      return NextResponse.json({
        error: 'Demo wallet not configured. Set DEMO_PRIVATE_KEY in .env.local to enable payments.',
      }, { status: 400 });
    }

    // Create account from private key
    const account = privateKeyToAccount(privateKey as `0x${string}`);

    // Create clients
    const publicClient = createPublicClient({
      chain: ARC_TESTNET,
      transport: http(),
    });

    const walletClient = createWalletClient({
      account,
      chain: ARC_TESTNET,
      transport: http(),
    });

    // Parse amount to USDC decimals (6)
    const amountInUnits = parseUnits(amount.toString(), 6);

    // Check balance first
    const balance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    });

    if (balance < amountInUnits) {
      return NextResponse.json({
        error: 'Insufficient USDC balance',
        balance: balance.toString(),
        required: amountInUnits.toString(),
      }, { status: 400 });
    }

    // Send transaction
    const hash = await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [to as `0x${string}`, amountInUnits],
    });

    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ hash });

    return NextResponse.json({
      success: true,
      txHash: hash,
      blockNumber: receipt.blockNumber.toString(),
      from: account.address,
      to,
      amount: amount.toString(),
    });
  } catch (error: any) {
    console.error('Payment error:', error);
    return NextResponse.json({
      error: error.message || 'Transaction failed',
    }, { status: 500 });
  }
}
