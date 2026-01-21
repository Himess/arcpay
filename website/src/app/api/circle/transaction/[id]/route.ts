import { NextRequest, NextResponse } from 'next/server';
import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: transactionId } = await params;

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 });
    }

    const client = getCircleClient();

    // Get transaction status from Circle
    const response = await client.getTransaction({ id: transactionId });
    const tx = (response.data as any)?.transaction || response.data;

    return NextResponse.json({
      success: true,
      transactionId,
      state: tx?.state || tx?.status,
      txHash: tx?.txHash || tx?.transactionHash,
      explorerUrl: tx?.txHash
        ? `https://testnet.arcscan.app/tx/${tx.txHash}`
        : null,
      blockNumber: tx?.blockNumber,
      gasUsed: tx?.gasUsed,
      createDate: tx?.createDate,
      updateDate: tx?.updateDate,
    });
  } catch (error: any) {
    console.error('Get transaction error:', error);
    const errorDetails = error.response?.data || error.response || null;
    return NextResponse.json({
      success: false,
      error: error.message,
      details: errorDetails,
    }, { status: 500 });
  }
}
