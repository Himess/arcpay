import { NextRequest, NextResponse } from 'next/server';

// x402 Protocol - Premium Content Paywall
const PRICE = '0.01'; // 0.01 USDC per request
const PAY_TO = process.env.NEXT_PUBLIC_MERCHANT_WALLET || '0x742d35Cc6634C0532925a3b844Bc9e7595f5bB71';
const NETWORK = 'arc-testnet';

// Verify payment on-chain
async function verifyPaymentOnchain(txHash: string, expectedTo: string, expectedAmount: string): Promise<boolean> {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.testnet.arc.network';

  try {
    // Get transaction receipt
    const receiptResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [txHash],
        id: 1,
      }),
    });
    const receiptResult = await receiptResponse.json();

    if (!receiptResult.result) {
      console.log('Transaction not found or pending');
      return false;
    }

    const receipt = receiptResult.result;

    // Check if transaction was successful
    if (receipt.status !== '0x1') {
      console.log('Transaction failed');
      return false;
    }

    // Get transaction details
    const txResponse = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionByHash',
        params: [txHash],
        id: 2,
      }),
    });
    const txResult = await txResponse.json();

    if (!txResult.result) {
      return false;
    }

    const tx = txResult.result;

    // Verify recipient (case-insensitive)
    if (tx.to?.toLowerCase() !== expectedTo.toLowerCase()) {
      console.log('Wrong recipient');
      return false;
    }

    // Verify amount (for native USDC transfer)
    const sentValue = BigInt(tx.value || '0');
    const expectedValue = BigInt(Math.floor(parseFloat(expectedAmount) * 1e18));

    // Allow 1% tolerance for gas price variations
    const minExpected = expectedValue * BigInt(99) / BigInt(100);
    if (sentValue < minExpected) {
      console.log('Insufficient amount');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Payment verification error:', error);
    return false;
  }
}

export async function GET(request: NextRequest) {
  const paymentHeader = request.headers.get('X-Payment');

  // If no payment, return 402 Payment Required
  if (!paymentHeader) {
    return new NextResponse(
      JSON.stringify({
        error: 'Payment required',
        price: PRICE,
        currency: 'USDC',
        payTo: PAY_TO,
        network: NETWORK,
      }),
      {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
          'X-Payment-Required': 'true',
          'X-Price': PRICE,
          'X-Currency': 'USDC',
          'X-Pay-To': PAY_TO,
          'X-Network': NETWORK,
          'X-Accept-Schemes': 'exact',
        },
      }
    );
  }

  // Verify payment
  try {
    const payment = JSON.parse(paymentHeader);

    if (!payment.txHash) {
      return NextResponse.json({ error: 'Missing txHash in payment' }, { status: 402 });
    }

    // Verify on-chain
    const isValid = await verifyPaymentOnchain(payment.txHash, PAY_TO, PRICE);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid or insufficient payment' },
        { status: 402 }
      );
    }

    // Payment valid - return premium content
    return NextResponse.json({
      success: true,
      premium: true,
      data: {
        message: 'Welcome to premium content! This is protected by x402 protocol.',
        features: [
          'Full API access',
          'No rate limits',
          'Priority support',
          'Advanced analytics',
        ],
        timestamp: new Date().toISOString(),
        paidAmount: PRICE,
        txHash: payment.txHash,
      },
    });
  } catch (error: any) {
    console.error('x402 payment error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}

// HEAD request for checking payment requirements
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, {
    status: 402,
    headers: {
      'X-Payment-Required': 'true',
      'X-Price': PRICE,
      'X-Currency': 'USDC',
      'X-Pay-To': PAY_TO,
      'X-Network': NETWORK,
      'X-Accept-Schemes': 'exact',
    },
  });
}
