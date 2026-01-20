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

// POST /api/circle/gasless - Gas sponsored transaction
export async function POST(request: NextRequest) {
  try {
    const { walletId, to, amount, data } = await request.json();

    if (!walletId || !to) {
      return NextResponse.json({
        error: 'walletId and to address are required',
      }, { status: 400 });
    }

    const client = await getCircleClient();

    // For SCA wallets, Gas Station automatically sponsors gas
    // We can either do a token transfer or a contract call

    let response;

    if (data) {
      // Contract call with data
      response = await client.request('/transactions/contractExecution', {
        method: 'POST',
        body: JSON.stringify({
          idempotencyKey: `gasless-${walletId}-${Date.now()}`,
          walletId,
          contractAddress: to,
          callData: data,
          fee: {
            type: 'level',
            config: {
              feeLevel: 'MEDIUM',
              gasLimit: '200000',
            },
          },
        }),
      });
    } else if (amount) {
      // Simple token transfer
      response = await client.request('/transactions/transfer', {
        method: 'POST',
        body: JSON.stringify({
          idempotencyKey: `gasless-${walletId}-${Date.now()}`,
          walletId,
          tokenId: 'USDC',
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
    } else {
      return NextResponse.json({
        error: 'Either amount or data is required',
      }, { status: 400 });
    }

    if (response.code && response.code !== 0) {
      return NextResponse.json({
        success: false,
        error: response.message || 'Gasless transaction failed',
      }, { status: 400 });
    }

    const transaction = response.data?.transaction;

    return NextResponse.json({
      success: true,
      txHash: transaction?.txHash,
      transactionId: transaction?.id,
      state: transaction?.state,
      sponsored: true, // Gas Station sponsored
      explorerUrl: transaction?.txHash
        ? `https://testnet.arcscan.app/tx/${transaction.txHash}`
        : null,
    });
  } catch (error: any) {
    console.error('Circle gasless transaction error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gasless transaction failed',
    }, { status: 500 });
  }
}

// GET /api/circle/gasless/stats - Get Gas Station stats
export async function GET(request: NextRequest) {
  try {
    const client = await getCircleClient();

    // Get gas station policy and usage
    const response = await client.request('/gasStation/policies');

    return NextResponse.json({
      success: true,
      policies: response.data?.policies || [],
    });
  } catch (error: any) {
    console.error('Circle gas station stats error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get gas station stats',
    }, { status: 500 });
  }
}
