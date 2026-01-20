import { NextRequest, NextResponse } from 'next/server';

const CIRCLE_API_URL = 'https://api.circle.com/v1/w3s';

// CCTP Domain IDs for different chains
const CCTP_DOMAINS: Record<string, number> = {
  'ethereum': 0,
  'sepolia': 0,
  'avalanche': 1,
  'op-mainnet': 2,
  'arbitrum': 3,
  'base': 6,
  'base-sepolia': 6,
  'polygon': 7,
  'arc': 26,
  'arc-testnet': 26,
};

async function getCircleClient() {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

  if (!apiKey || !entitySecret) {
    throw new Error('Circle API credentials not configured');
  }

  return {
    apiKey,
    entitySecret,
    async request(endpoint: string, options: RequestInit = {}) {
      const response = await fetch(`${CIRCLE_API_URL}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-Entity-Secret': entitySecret,
          ...options.headers,
        },
      });
      return response.json();
    },
  };
}

// POST /api/circle/bridge - Initiate CCTP bridge transfer
export async function POST(request: NextRequest) {
  try {
    const {
      sourceChain,
      destinationChain,
      amount,
      sourceAddress,
      destinationAddress,
      walletId,
    } = await request.json();

    if (!sourceChain || !destinationChain || !amount) {
      return NextResponse.json({
        error: 'sourceChain, destinationChain, and amount are required',
      }, { status: 400 });
    }

    // Validate chains
    const sourceDomain = CCTP_DOMAINS[sourceChain.toLowerCase()];
    const destDomain = CCTP_DOMAINS[destinationChain.toLowerCase()];

    if (sourceDomain === undefined || destDomain === undefined) {
      return NextResponse.json({
        error: `Unsupported chain. Supported: ${Object.keys(CCTP_DOMAINS).join(', ')}`,
      }, { status: 400 });
    }

    const client = await getCircleClient();

    // Create cross-chain USDC transfer via CCTP
    const response = await client.request('/transactions/transfer', {
      method: 'POST',
      body: JSON.stringify({
        idempotencyKey: `bridge-${Date.now()}`,
        walletId,
        tokenId: 'USDC',
        destinationAddress: destinationAddress || sourceAddress,
        destinationBlockchain: destinationChain.toUpperCase().replace('-', '_'),
        amounts: [amount],
        fee: {
          type: 'level',
          config: {
            feeLevel: 'MEDIUM',
          },
        },
      }),
    });

    if (response.code && response.code !== 0) {
      return NextResponse.json({
        success: false,
        error: response.message || 'Bridge transfer failed',
      }, { status: 400 });
    }

    const transaction = response.data?.transaction;

    return NextResponse.json({
      success: true,
      transferId: transaction?.id,
      burnTxHash: transaction?.txHash,
      status: transaction?.state || 'pending',
      sourceChain,
      destinationChain,
      amount,
      sourceDomain,
      destinationDomain: destDomain,
      explorerUrl: transaction?.txHash
        ? `https://testnet.arcscan.app/tx/${transaction.txHash}`
        : null,
    });
  } catch (error: any) {
    console.error('Circle bridge error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Bridge transfer failed',
    }, { status: 500 });
  }
}

// GET /api/circle/bridge?transferId=xxx - Get bridge transfer status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transferId = searchParams.get('transferId');

    if (!transferId) {
      return NextResponse.json({ error: 'transferId is required' }, { status: 400 });
    }

    const client = await getCircleClient();
    const response = await client.request(`/transactions/${transferId}`);

    if (response.code && response.code !== 0) {
      return NextResponse.json({
        success: false,
        error: response.message || 'Failed to get transfer status',
      }, { status: 400 });
    }

    const tx = response.data?.transaction;

    // Map Circle states to CCTP states
    let cctpStatus = 'pending';
    switch (tx?.state) {
      case 'INITIATED':
      case 'PENDING_RISK_SCREENING':
        cctpStatus = 'pending';
        break;
      case 'SENT':
      case 'CONFIRMED':
        cctpStatus = 'burned';
        break;
      case 'COMPLETE':
        cctpStatus = 'completed';
        break;
      case 'FAILED':
      case 'DENIED':
        cctpStatus = 'failed';
        break;
    }

    return NextResponse.json({
      success: true,
      transferId,
      status: cctpStatus,
      circleState: tx?.state,
      burnTxHash: tx?.txHash,
      mintTxHash: tx?.destinationTxHash,
      createDate: tx?.createDate,
      updateDate: tx?.updateDate,
    });
  } catch (error: any) {
    console.error('Circle bridge status error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get transfer status',
    }, { status: 500 });
  }
}
