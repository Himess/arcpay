import { NextRequest, NextResponse } from 'next/server';

const CIRCLE_API_URL = 'https://api.circle.com/v1/w3s';

// USDC Token IDs for different chains
const USDC_TOKEN_IDS: Record<string, string> = {
  'ARC-TESTNET': 'USDC', // Circle will resolve the correct token
  'BASE-SEPOLIA': 'USDC',
  'SEPOLIA': 'USDC',
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

// POST /api/circle/transfer - USDC transfer from Circle wallet
export async function POST(request: NextRequest) {
  try {
    const { walletId, to, amount, blockchain } = await request.json();

    if (!walletId || !to || !amount) {
      return NextResponse.json({
        error: 'walletId, to, and amount are required',
      }, { status: 400 });
    }

    // Validate address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(to)) {
      return NextResponse.json({ error: 'Invalid recipient address' }, { status: 400 });
    }

    const client = await getCircleClient();

    // Create transfer transaction
    const response = await client.request('/transactions/transfer', {
      method: 'POST',
      body: JSON.stringify({
        idempotencyKey: `transfer-${walletId}-${Date.now()}`,
        walletId,
        tokenId: USDC_TOKEN_IDS[blockchain || 'ARC-TESTNET'] || 'USDC',
        destinationAddress: to,
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
        error: response.message || 'Transfer failed',
      }, { status: 400 });
    }

    const transaction = response.data?.transaction;

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction?.id,
        state: transaction?.state,
        txHash: transaction?.txHash,
        createDate: transaction?.createDate,
      },
      explorerUrl: transaction?.txHash
        ? `https://testnet.arcscan.app/tx/${transaction.txHash}`
        : null,
    });
  } catch (error: any) {
    console.error('Circle transfer error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Transfer failed',
    }, { status: 500 });
  }
}

// GET /api/circle/transfer?transactionId=xxx - Get transaction status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');

    if (!transactionId) {
      return NextResponse.json({ error: 'transactionId is required' }, { status: 400 });
    }

    const client = await getCircleClient();
    const response = await client.request(`/transactions/${transactionId}`);

    if (response.code && response.code !== 0) {
      return NextResponse.json({
        success: false,
        error: response.message || 'Failed to get transaction',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      transaction: response.data?.transaction,
    });
  } catch (error: any) {
    console.error('Circle transaction get error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get transaction',
    }, { status: 500 });
  }
}
