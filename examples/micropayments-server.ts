/**
 * ArcPay Micropayments Server Example
 *
 * This example demonstrates how to create a paywalled API server
 * using the x402 protocol.
 *
 * Run: npx ts-node examples/micropayments-server.ts
 */

import express from 'express';
import { ArcPay } from 'arcpay';

const PAYMENT_ADDRESS = process.env.PAYMENT_ADDRESS || '0xYourPaymentAddress';
const PORT = 3000;

async function main() {
  const app = express();
  app.use(express.json());

  // Initialize ArcPay
  const arc = await ArcPay.init({
    network: 'arc-testnet',
  });

  // Apply paywall middleware to specific routes
  app.use(arc.micropayments.paywall(PAYMENT_ADDRESS, {
    // Free tier - basic data
    'GET /api/data': {
      price: '0.00', // Free
      description: 'Basic data endpoint',
    },

    // Premium tier - detailed data
    'GET /api/premium': {
      price: '0.10', // $0.10 per request
      description: 'Premium data with full details',
    },

    // AI generation - higher cost
    'POST /api/generate': {
      price: '1.00', // $1.00 per generation
      description: 'AI content generation',
    },

    // Bulk operations - per-item pricing
    'POST /api/bulk': {
      price: '0.05', // $0.05 per request
      description: 'Bulk data processing',
    },
  }));

  // Free endpoint - no payment required
  app.get('/api/data', (req, res) => {
    res.json({
      message: 'This is free data',
      timestamp: new Date().toISOString(),
    });
  });

  // Premium endpoint - requires payment
  app.get('/api/premium', (req, res) => {
    res.json({
      message: 'Premium data - thanks for paying!',
      data: {
        detailed: true,
        analysis: 'Full market analysis...',
        predictions: ['Trend A', 'Trend B'],
      },
      timestamp: new Date().toISOString(),
    });
  });

  // AI generation endpoint
  app.post('/api/generate', (req, res) => {
    const { prompt } = req.body;
    res.json({
      message: 'AI generation complete',
      prompt,
      result: `Generated content for: ${prompt}`,
      tokens: 150,
    });
  });

  // Bulk processing endpoint
  app.post('/api/bulk', (req, res) => {
    const { items } = req.body;
    res.json({
      message: 'Bulk processing complete',
      processed: items?.length || 0,
      results: items?.map((item: unknown) => ({ item, processed: true })),
    });
  });

  // Health check (always free)
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', network: arc.network.name });
  });

  app.listen(PORT, () => {
    console.log(`\n🚀 Paywalled API server running on http://localhost:${PORT}`);
    console.log(`\nEndpoints:`);
    console.log(`  GET  /api/data     - Free`);
    console.log(`  GET  /api/premium  - $0.10 USDC`);
    console.log(`  POST /api/generate - $1.00 USDC`);
    console.log(`  POST /api/bulk     - $0.05 USDC`);
    console.log(`\nPayments sent to: ${PAYMENT_ADDRESS}`);
  });
}

main().catch(console.error);
