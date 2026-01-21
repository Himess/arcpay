import { NextRequest, NextResponse } from 'next/server';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

// Circle client singleton
let circleClient: ReturnType<typeof initiateDeveloperControlledWalletsClient> | null = null;

function getCircleClient() {
  if (circleClient) return circleClient;

  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

  if (!apiKey || !entitySecret) {
    throw new Error('Circle API credentials not configured');
  }

  circleClient = initiateDeveloperControlledWalletsClient({
    apiKey,
    entitySecret,
  });

  return circleClient;
}

// POST /api/circle/gasless - Gasless transaction (Gas Station sponsored)
export async function POST(request: NextRequest) {
  try {
    const { walletId, to, amount, tokenId = 'USDC' } = await request.json();

    // Use env wallet ID as fallback
    const effectiveWalletId = walletId || process.env.CIRCLE_WALLET_ID;

    if (!effectiveWalletId || !to || !amount) {
      return NextResponse.json({
        error: 'walletId, to, and amount are required',
      }, { status: 400 });
    }

    const client = getCircleClient();

    // For SCA wallets, Gas Station automatically sponsors gas fees
    const response = await client.createTransaction({
      walletId: effectiveWalletId,
      tokenId,
      destinationAddress: to,
      amount: [amount],
      fee: {
        type: 'level',
        config: {
          feeLevel: 'MEDIUM',
        },
      },
    });

    // SDK returns different response structure
    const txData = response.data as any;
    const transactionId = txData?.id || txData?.transactionId;
    const txHash = txData?.txHash || txData?.transactionHash;
    const state = txData?.state || txData?.status;

    if (!transactionId && !txHash) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create transaction',
        details: response,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      transactionId,
      txHash,
      state,
      sponsored: true, // Gas Station sponsored
      explorerUrl: txHash
        ? `https://testnet.arcscan.app/tx/${txHash}`
        : null,
    });
  } catch (error: any) {
    console.error('Gasless transaction error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gasless transaction failed',
    }, { status: 500 });
  }
}

// GET /api/circle/gasless - Check Gas Station status
export async function GET() {
  try {
    const client = getCircleClient();

    // Get wallet info to check if Gas Station is enabled
    const walletId = process.env.CIRCLE_WALLET_ID;

    if (!walletId) {
      return NextResponse.json({
        success: false,
        error: 'CIRCLE_WALLET_ID not configured',
        gasStationEnabled: false,
      });
    }

    const walletResponse = await client.getWallet({ id: walletId });
    const wallet = (walletResponse.data as any)?.wallet || walletResponse.data;

    if (!wallet) {
      return NextResponse.json({
        success: false,
        error: 'Wallet not found',
        gasStationEnabled: false,
      });
    }

    // SCA wallets have Gas Station enabled by default on testnet
    const gasStationEnabled = wallet.accountType === 'SCA';

    return NextResponse.json({
      success: true,
      gasStationEnabled,
      wallet: {
        id: wallet.id,
        address: wallet.address,
        blockchain: wallet.blockchain,
        accountType: wallet.accountType,
        state: wallet.state,
      },
      limits: {
        dailyLimit: '50 USDC',
        perTransaction: 'No limit (testnet)',
        sponsoredToken: 'USDC',
      },
      gasStationContract: '0x7ceA357B5AC0639F89F9e378a1f03Aa5005C0a25',
    });
  } catch (error: any) {
    console.error('Gas Station status error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      gasStationEnabled: false,
    }, { status: 500 });
  }
}
