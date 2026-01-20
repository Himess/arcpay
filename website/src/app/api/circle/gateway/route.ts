import { NextRequest, NextResponse } from 'next/server';

const CIRCLE_API_URL = 'https://api.circle.com/v1/w3s';

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

// GET /api/circle/gateway?address=xxx - Get unified balance across chains
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'address is required' }, { status: 400 });
    }

    const client = await getCircleClient();

    // Get balances from all wallets for this address
    const walletsResponse = await client.request('/wallets');

    if (walletsResponse.code && walletsResponse.code !== 0) {
      return NextResponse.json({
        success: false,
        error: walletsResponse.message || 'Failed to get wallets',
      }, { status: 400 });
    }

    const wallets = walletsResponse.data?.wallets || [];

    // Filter wallets by address and aggregate balances
    const balancesByChain: Record<string, string> = {};
    let totalBalance = 0;

    for (const wallet of wallets) {
      if (wallet.address?.toLowerCase() === address.toLowerCase()) {
        // Get balance for this wallet
        const balanceResponse = await client.request(`/wallets/${wallet.id}/balances`);
        const balances = balanceResponse.data?.tokenBalances || [];

        for (const balance of balances) {
          if (balance.token?.symbol === 'USDC') {
            const chainKey = wallet.blockchain?.toLowerCase() || 'unknown';
            const amount = parseFloat(balance.amount || '0');
            balancesByChain[chainKey] = amount.toString();
            totalBalance += amount;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      address,
      totalBalance: totalBalance.toString(),
      balances: balancesByChain,
      chains: Object.keys(balancesByChain),
    });
  } catch (error: any) {
    console.error('Circle gateway error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get unified balance',
    }, { status: 500 });
  }
}

// POST /api/circle/gateway - Cross-chain transfer
export async function POST(request: NextRequest) {
  try {
    const { fromChain, toChain, amount, address, walletId } = await request.json();

    if (!fromChain || !toChain || !amount) {
      return NextResponse.json({
        error: 'fromChain, toChain, and amount are required',
      }, { status: 400 });
    }

    const client = await getCircleClient();

    // Create cross-chain transfer using Circle's CCTP integration
    const response = await client.request('/transactions/transfer', {
      method: 'POST',
      body: JSON.stringify({
        idempotencyKey: `gateway-${Date.now()}`,
        walletId,
        tokenId: 'USDC',
        destinationAddress: address,
        destinationBlockchain: toChain.toUpperCase(),
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
        error: response.message || 'Cross-chain transfer failed',
      }, { status: 400 });
    }

    const transaction = response.data?.transaction;

    return NextResponse.json({
      success: true,
      transferId: transaction?.id,
      txHash: transaction?.txHash,
      state: transaction?.state,
      fromChain,
      toChain,
      amount,
      explorerUrl: transaction?.txHash
        ? `https://testnet.arcscan.app/tx/${transaction.txHash}`
        : null,
    });
  } catch (error: any) {
    console.error('Circle gateway transfer error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Cross-chain transfer failed',
    }, { status: 500 });
  }
}
