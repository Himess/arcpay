import { NextRequest, NextResponse } from 'next/server';

// x402 Protocol - Weather API Demo (micropayment example)
const PRICE = '0.001'; // 0.001 USDC per request (very small for demo)
const PAY_TO = process.env.NEXT_PUBLIC_MERCHANT_WALLET || '0x742d35Cc6634C0532925a3b844Bc9e7595f5bB71';
const NETWORK = 'arc-testnet';

// Verify payment on-chain
async function verifyPaymentOnchain(txHash: string, expectedTo: string, expectedAmount: string): Promise<boolean> {
  const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.testnet.arc.network';

  try {
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

    if (!receiptResult.result || receiptResult.result.status !== '0x1') {
      return false;
    }

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

    if (!txResult.result) return false;

    const tx = txResult.result;
    if (tx.to?.toLowerCase() !== expectedTo.toLowerCase()) return false;

    const sentValue = BigInt(tx.value || '0');
    const expectedValue = BigInt(Math.floor(parseFloat(expectedAmount) * 1e18));
    const minExpected = expectedValue * BigInt(99) / BigInt(100);

    return sentValue >= minExpected;
  } catch (error) {
    console.error('Payment verification error:', error);
    return false;
  }
}

// Mock weather data
function getWeatherData(city: string) {
  const cities: Record<string, any> = {
    istanbul: { temp: 15, condition: 'Partly Cloudy', humidity: 65, wind: 12 },
    london: { temp: 8, condition: 'Rainy', humidity: 85, wind: 20 },
    newyork: { temp: 12, condition: 'Sunny', humidity: 45, wind: 8 },
    tokyo: { temp: 18, condition: 'Clear', humidity: 55, wind: 5 },
    dubai: { temp: 28, condition: 'Sunny', humidity: 40, wind: 15 },
  };

  const normalized = city.toLowerCase().replace(/\s/g, '');
  return cities[normalized] || {
    temp: Math.floor(Math.random() * 30) + 5,
    condition: ['Sunny', 'Cloudy', 'Rainy', 'Clear'][Math.floor(Math.random() * 4)],
    humidity: Math.floor(Math.random() * 60) + 30,
    wind: Math.floor(Math.random() * 25) + 5,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get('city') || 'Istanbul';
  const paymentHeader = request.headers.get('X-Payment');

  // If no payment, return 402 Payment Required
  if (!paymentHeader) {
    return new NextResponse(
      JSON.stringify({
        error: 'Payment required for weather data',
        price: PRICE,
        currency: 'USDC',
        payTo: PAY_TO,
        network: NETWORK,
        description: 'Pay 0.001 USDC for current weather data',
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

    // Payment valid - return weather data
    const weather = getWeatherData(city);

    return NextResponse.json({
      success: true,
      city: city.charAt(0).toUpperCase() + city.slice(1).toLowerCase(),
      temperature: weather.temp,
      temperatureUnit: 'C',
      condition: weather.condition,
      humidity: weather.humidity,
      wind: {
        speed: weather.wind,
        unit: 'km/h',
      },
      timestamp: new Date().toISOString(),
      paid: PRICE,
      txHash: payment.txHash,
    });
  } catch (error: any) {
    console.error('x402 payment error:', error);
    return NextResponse.json(
      { error: error.message || 'Payment verification failed' },
      { status: 500 }
    );
  }
}

export async function HEAD(request: NextRequest) {
  return new NextResponse(null, {
    status: 402,
    headers: {
      'X-Payment-Required': 'true',
      'X-Price': PRICE,
      'X-Currency': 'USDC',
      'X-Pay-To': PAY_TO,
      'X-Network': NETWORK,
    },
  });
}
