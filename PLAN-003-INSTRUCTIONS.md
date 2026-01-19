# Instructions for Claude Code - Plan 003

## YOUR MISSION

Redesign the docs page (`website/src/app/docs/page.tsx`) to emphasize ArcPay's killer feature: **simplicity**.

The main message: **"50 lines of code → 3 lines with ArcPay"**

---

## WHAT TO BUILD

### 1. Hero Section (Top of Page)

Add a compelling hero that shows the value proposition:

```tsx
<div className="hero">
  <h1>Build Payment Apps in Minutes, Not Weeks</h1>
  <p>ArcPay reduces 50+ lines of blockchain code to just 3 lines</p>

  <div className="comparison-preview">
    <div className="without">WITHOUT ArcPay: 50+ lines, 2 hours</div>
    <div className="arrow">→</div>
    <div className="with">WITH ArcPay: 3 lines, 2 minutes</div>
  </div>

  <div className="cta-buttons">
    <button>Get Started</button>
    <button>Try Playground</button>
  </div>
</div>
```

### 2. Before/After Comparison Cards

For each feature, show side-by-side comparison:

**Payment Example:**
```
WITHOUT ArcPay (15+ lines):
import { ethers } from 'ethers';
const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(USDC, abi, wallet);
const amount = ethers.parseUnits('100', 6);
const tx = await contract.transfer(to, amount);
await tx.wait();
// + error handling, gas estimation...

WITH ArcPay (2 lines):
const arc = await ArcPay.init({ network: 'arc-testnet' });
await arc.sendUSDC('0x...', '100');
```

Create comparison cards for:
- 💳 Payments (15+ → 2 lines)
- 🔒 Escrow (50+ → 1 line)
- 💸 Streaming (100+ → 1 line)
- 📇 Contacts ("0x..." → "ahmed")
- 🎤 Voice (200+ → just speak)
- 🤖 AI Agents (complex → simple)

### 3. Feature Grid

Create a responsive grid of feature cards:

```tsx
const features = [
  { icon: '💳', title: 'Payments', code: 'pay("0x...", "100")', saved: '15+ → 2' },
  { icon: '🔒', title: 'Escrow', code: 'escrow("0x...", "500", 7)', saved: '50+ → 1' },
  { icon: '💸', title: 'Streaming', code: 'stream("0x...", "5000", 30)', saved: '100+ → 1' },
  { icon: '📇', title: 'Contacts', code: 'pay("ahmed", "50")', saved: 'N/A → 2' },
  { icon: '🗓️', title: 'Subscriptions', code: 'payAllDueBills()', saved: 'N/A → 1' },
  { icon: '🎤', title: 'Voice', code: '"Send 50 to ahmed"', saved: '200+ → 0' },
  { icon: '🤖', title: 'AI Agents', code: 'agent.executeTask()', saved: 'Complex → Simple' },
  { icon: '🕵️', title: 'Privacy', code: 'stealthPay("0x...", "100")', saved: '300+ → 1' },
  { icon: '⚡', title: 'Channels', code: 'microPay("0x...", "0.01")', saved: '150+ → 1' },
];
```

Each card should have:
- Icon + Title
- One-line code example
- "Lines saved" badge
- "Try in Playground" button

### 4. Quick Reference Table

Add a table showing all one-liner APIs:

| Action | Code |
|--------|------|
| Send payment | `await pay('0x...', '100')` |
| Check balance | `await balance()` |
| Create escrow | `await escrow('0x...', '500', 7)` |
| Start stream | `await stream('0x...', '1000', 30)` |
| Add contact | `await addContact('ahmed', '0x...')` |
| Pay contact | `await pay('ahmed', '50')` |
| Get due bills | `await getDueBills()` |
| Pay all bills | `await payAllDueBills()` |
| Voice command | `"Send 50 to ahmed"` |

### 5. Keep Existing Content

Don't delete existing documentation sections - reorganize them under the new structure:
- Getting Started
- Core Features (Payments, Escrow, Streaming, Channels)
- Contacts & Subscriptions
- AI & Voice
- Advanced (Privacy, Smart Wallet, Compliance)

---

## DESIGN REQUIREMENTS

1. **Dark theme** - Match the playground design
2. **Syntax highlighting** - Use proper code highlighting
3. **Responsive** - Works on mobile
4. **Animations** - Subtle hover effects, smooth scrolling
5. **Copy buttons** - Each code block should be copyable
6. **Playground links** - "Try it" buttons that open playground with example code

---

## STYLING HINTS

```tsx
// Use these color accents
const colors = {
  primary: '#3b82f6',    // Blue
  success: '#22c55e',    // Green
  warning: '#f59e0b',    // Orange
  danger: '#ef4444',     // Red
  background: '#0a0a0a', // Dark
  card: '#1a1a1a',       // Card bg
  border: '#333',        // Borders
};

// Comparison card styling
.comparison-card {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  background: #1a1a1a;
  border-radius: 12px;
  padding: 1.5rem;
}

.without-arcpay {
  opacity: 0.6;
  border-left: 3px solid #ef4444; // Red = bad
}

.with-arcpay {
  border-left: 3px solid #22c55e; // Green = good
}
```

---

## FILE TO MODIFY

```
website/src/app/docs/page.tsx
```

---

## QUALITY CHECKLIST

Before done, verify:
- [ ] Hero section clearly shows "50 lines → 3 lines"
- [ ] At least 5 Before/After comparison cards
- [ ] Feature grid with 9 cards
- [ ] Quick Reference table
- [ ] All "Try in Playground" buttons work
- [ ] Code blocks have copy buttons
- [ ] Mobile responsive
- [ ] Dark theme consistent
- [ ] Smooth animations

---

## START NOW

Read `PLAN-003-DOCS-REDESIGN.md` for full details, then implement.

**Make it visually impressive - this is what the hackathon judges will see!**
