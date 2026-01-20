import { NextRequest, NextResponse } from 'next/server';

// Circle Developer Controlled Wallets API
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

// POST /api/circle/wallets - Create new wallet
export async function POST(request: NextRequest) {
  try {
    const { userId, blockchain } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const client = await getCircleClient();

    // 1. Create or get wallet set
    const walletSetRes = await client.request('/walletSets', {
      method: 'POST',
      body: JSON.stringify({
        name: `ArcPay-${userId}`,
        idempotencyKey: `walletset-${userId}-${Date.now()}`,
      }),
    });

    if (walletSetRes.code) {
      // If wallet set already exists, try to find it
      console.log('Wallet set may already exist:', walletSetRes);
    }

    const walletSetId = walletSetRes.data?.walletSet?.id;

    // 2. Create wallet (SCA for gas sponsorship)
    const walletsRes = await client.request('/wallets', {
      method: 'POST',
      body: JSON.stringify({
        idempotencyKey: `wallet-${userId}-${Date.now()}`,
        walletSetId: walletSetId,
        blockchains: [blockchain || 'ARC-TESTNET'],
        count: 1,
        accountType: 'SCA', // Smart Contract Account for Gas Station
        metadata: [{
          name: `User-${userId}`,
          refId: userId,
        }],
      }),
    });

    if (walletsRes.code && walletsRes.code !== 0) {
      return NextResponse.json({
        success: false,
        error: walletsRes.message || 'Failed to create wallet',
      }, { status: 400 });
    }

    const wallet = walletsRes.data?.wallets?.[0];

    return NextResponse.json({
      success: true,
      wallet: {
        id: wallet?.id,
        address: wallet?.address,
        blockchain: wallet?.blockchain,
        state: wallet?.state,
        accountType: wallet?.accountType,
      },
    });
  } catch (error: any) {
    console.error('Circle wallet creation error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create wallet',
    }, { status: 500 });
  }
}

// GET /api/circle/wallets?walletId=xxx - Get wallet info
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletId = searchParams.get('walletId');

    if (!walletId) {
      return NextResponse.json({ error: 'walletId is required' }, { status: 400 });
    }

    const client = await getCircleClient();
    const response = await client.request(`/wallets/${walletId}`);

    if (response.code && response.code !== 0) {
      return NextResponse.json({
        success: false,
        error: response.message || 'Failed to get wallet',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      wallet: response.data?.wallet,
    });
  } catch (error: any) {
    console.error('Circle wallet get error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to get wallet',
    }, { status: 500 });
  }
}
