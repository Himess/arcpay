# PLAN-006: UI Redesign - Modern Tech Theme

## Overview
Complete UI redesign with new color palette, logo integration, and Modern Tech style (Linear/Vercel inspired).

---

## NEW: Hero Section - "All-in-One SDK" Message

Add this prominent section to Hero (Homepage):

### Main Tagline
```tsx
<h1 className="text-5xl font-bold text-white text-center">
  The Complete SDK for<br />
  <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
    Agentic Commerce on Arc
  </span>
</h1>

<p className="text-xl text-gray-400 text-center mt-4">
  x402 protocol, gasless payments, off-chain channels, and Circle Gateway — all in one SDK
</p>
```

### Tech Stack Badges (Below tagline)
```tsx
<div className="flex flex-wrap justify-center gap-3 mt-8">
  <span className="px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 font-medium">
    x402 Protocol
  </span>
  <span className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400 font-medium">
    Gasless Payments
  </span>
  <span className="px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-full text-green-400 font-medium">
    Off-chain Channels
  </span>
  <span className="px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-400 font-medium">
    Circle Gateway
  </span>
</div>
```

### Stats Banner (Below badges)
```tsx
<div className="flex justify-center gap-12 mt-12 py-8 border-y border-gray-800/50">
  <div className="text-center">
    <div className="text-4xl font-bold text-blue-400">177</div>
    <div className="text-sm text-gray-400 mt-1">APIs</div>
  </div>
  <div className="text-center">
    <div className="text-4xl font-bold text-cyan-400">500+</div>
    <div className="text-sm text-gray-400 mt-1">Tests</div>
  </div>
  <div className="text-center">
    <div className="text-4xl font-bold text-green-400">26</div>
    <div className="text-sm text-gray-400 mt-1">Modules</div>
  </div>
  <div className="text-center">
    <div className="text-4xl font-bold text-purple-400">100%</div>
    <div className="text-sm text-gray-400 mt-1">On-chain Tested</div>
  </div>
</div>
```

---

## NEW: Playground Category Reordering

Reorder Playground categories - no tier labels, just strategic ordering.
Most important APIs first, utilities last. No "killer features" text - just clean ordering.

```typescript
const PLAYGROUND_ORDER = [
  // Hackathon priority - these appear first
  'Micropayments',      // x402 protocol
  'Channels',           // Off-chain payments
  'Gateway',            // Circle Gateway
  'Voice',              // Voice commands
  'Agent',              // AI agents
  'Split Payment',
  'Payment Links',
  'Templates',

  // ─────────────────── (visual separator in UI - just a thin line, no text)

  // Core payment features
  'Core',
  'Contacts',
  'Escrow',
  'Streams',
  'Payment Requests',
  'Subscriptions',

  // Advanced features
  'Bridge',
  'FX',
  'Privacy',
  'Smart Wallet',
  'AI Wallet',
  'Invoices',
  'Intent',
  'AI',

  // Utilities at bottom
  'Onchain Agent',
  'Compliance',
  'Gas Station',
  'Paymaster',
  'USYC',
  'Combo',
  'Contracts',
  'Utilities',
];
```

### Visual Separator
Add a subtle horizontal line after first 8 items (Templates). No text labels.

```tsx
{index === 7 && <div className="border-t border-gray-800 my-2" />}
```

### Update apiExamples.ts
Reorder the `API_EXAMPLES` array to match this order. NO tier labels in UI.

---

## Logo

Logo file: `website/public/logo.png`
- Use in: Header (navbar), Favicon, Footer
- Style: Logo icon + "ArcPay" text

---

## Color Palette

### Primary Colors
```css
:root {
  /* Background */
  --bg-primary: #0A0F1C;        /* Deep dark blue */
  --bg-secondary: #111827;      /* Slightly lighter */
  --bg-card: #1F2937;           /* Card background */
  --bg-card-hover: #374151;     /* Card hover */

  /* Accent */
  --accent-primary: #3B82F6;    /* Blue */
  --accent-secondary: #06B6D4;  /* Cyan */
  --accent-gradient: linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%);

  /* Text */
  --text-primary: #FFFFFF;      /* White */
  --text-secondary: #9CA3AF;    /* Gray */
  --text-muted: #6B7280;        /* Muted gray */

  /* Borders */
  --border-color: #1F2937;      /* Subtle border */
  --border-hover: #374151;      /* Hover border */

  /* Success/Error */
  --success: #10B981;           /* Green */
  --error: #EF4444;             /* Red */
  --warning: #F59E0B;           /* Amber */
}
```

### Replace Old Colors
| Old (Remove) | New (Use) |
|--------------|-----------|
| `#8B5CF6` (Purple) | `#3B82F6` (Blue) |
| `#EC4899` (Pink) | `#06B6D4` (Cyan) |
| `from-indigo-600` | `from-blue-500` |
| `from-purple-600` | `to-cyan-500` |

---

## Typography

```css
/* Headings */
font-family: 'Inter', -apple-system, sans-serif;
font-weight: 700;

/* Body */
font-family: 'Inter', -apple-system, sans-serif;
font-weight: 400;

/* Code */
font-family: 'JetBrains Mono', 'Fira Code', monospace;
```

---

## Component Changes

### 1. Header/Navbar

**Before:** Text-only "ArcPay"
**After:** Logo + "ArcPay" text

```tsx
// website/src/components/Header.tsx or layout
<header className="fixed top-0 w-full bg-[#0A0F1C]/80 backdrop-blur-xl border-b border-gray-800/50 z-50">
  <nav className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
    <Link href="/" className="flex items-center gap-2">
      <Image src="/logo.png" alt="ArcPay" width={32} height={32} />
      <span className="font-bold text-xl text-white">ArcPay</span>
    </Link>
    {/* ... nav items */}
  </nav>
</header>
```

### 2. Hero Section

**Before:** Purple/Pink gradient
**After:** Blue/Cyan subtle gradient with glassmorphism

```tsx
<section className="relative min-h-screen bg-[#0A0F1C]">
  {/* Gradient orbs (Linear style) */}
  <div className="absolute top-20 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
  <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />

  <div className="relative z-10">
    <h1 className="text-5xl font-bold text-white">
      Build Payment Apps<br />
      <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
        in Minutes, Not Weeks
      </span>
    </h1>
  </div>
</section>
```

### 3. Cards

**Before:** Solid dark with purple accent
**After:** Glassmorphism with subtle border

```tsx
<div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800/50 rounded-2xl p-6 hover:border-gray-700/50 transition-all">
  {/* Card content */}
</div>
```

### 4. Buttons

**Primary Button:**
```tsx
<button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-blue-500/25 transition-all">
  Get Started
</button>
```

**Secondary Button:**
```tsx
<button className="px-6 py-3 bg-gray-800 border border-gray-700 text-white font-semibold rounded-xl hover:bg-gray-700 transition-all">
  Learn More
</button>
```

### 5. Code Blocks

```tsx
<pre className="bg-[#0D1117] border border-gray-800 rounded-xl p-4 font-mono text-sm">
  <code className="text-gray-300">
    {/* Syntax highlighted code */}
  </code>
</pre>
```

### 6. Badges/Tags

```tsx
<span className="px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-sm">
  NEW
</span>
```

---

## Page-by-Page Changes

### Homepage (/)
1. ✅ Add logo to header
2. ✅ Change gradient from purple/pink to blue/cyan
3. ✅ Add glassmorphism cards
4. ✅ Add subtle animated gradient orbs in background
5. ✅ Update button colors

### Docs Page (/docs)
1. ✅ Update sidebar colors
2. ✅ Update code block styling
3. ✅ Change accent colors in comparisons
4. ✅ Update "NEW" badges to blue

### Playground (/playground)
1. ✅ Update header/tab colors
2. ✅ Update code editor theme
3. ✅ Update output panel styling
4. ✅ Change run button to blue gradient

---

## Files to Modify

```
website/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Add logo, update colors
│   │   ├── page.tsx            # Hero, features section
│   │   ├── docs/page.tsx       # Docs styling
│   │   └── playground/page.tsx # Playground styling
│   ├── components/
│   │   └── playground/
│   │       └── *.tsx           # Playground components
│   └── globals.css             # CSS variables
├── public/
│   ├── logo.png                # ✅ Already added
│   └── favicon.ico             # Update to logo icon
└── tailwind.config.js          # Custom colors
```

---

## Favicon

Create favicon from logo:
1. Crop the "A" icon from logo
2. Create 32x32, 16x16, 180x180 (apple-touch-icon) versions
3. Save as `favicon.ico` and `apple-touch-icon.png`

---

## Animations (Subtle)

```css
/* Gradient orb float animation */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}

/* Card hover lift */
.card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(59, 130, 246, 0.1);
}

/* Button glow on hover */
.btn-primary:hover {
  box-shadow: 0 0 30px rgba(59, 130, 246, 0.4);
}
```

---

## Before/After Preview

### Before (Current)
- Purple/Pink gradient (#8B5CF6, #EC4899)
- Generic AI startup look
- No logo, text-only branding

### After (New)
- Blue/Cyan gradient (#3B82F6, #06B6D4)
- Modern tech/fintech look (Linear/Vercel style)
- Professional logo + branding
- Glassmorphism cards
- Subtle animations

---

## Implementation Order

1. Update `tailwind.config.js` with new colors
2. Update `globals.css` with CSS variables
3. Add logo to header/navbar
4. Update homepage hero and cards
5. Update docs page styling
6. Update playground styling
7. Create and add favicon
8. Test all pages

---

## Emojis

Keep emojis in:
- Feature cards (💳, 🔒, 💸, etc.)
- Section headers
- Quick reference table

Style them consistently - not too large, subtle.

---

## Success Criteria

1. ✅ Logo visible in header
2. ✅ Blue/Cyan color scheme throughout
3. ✅ No purple/pink colors remaining
4. ✅ Glassmorphism cards
5. ✅ Modern tech aesthetic
6. ✅ All pages consistent
7. ✅ Favicon updated
8. ✅ Build passes
