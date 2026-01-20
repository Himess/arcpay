'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import APIExplorer from '../../components/playground/APIExplorer';
import { API_CATEGORIES, TOTAL_API_COUNT, type APIItem, type APICategory } from '../../components/playground/apiExamples';

// Dynamic import for Monaco Editor (client-side only)
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false });

type DemoMode = 'ai-demo' | 'code' | 'payments' | 'streaming';
type AISubMode = 'voice' | 'image';
type PaymentSubMode = 'contacts' | 'templates' | 'split' | 'links' | 'requests';

interface LogEntry {
  type: 'info' | 'success' | 'error' | 'user' | 'ai' | 'system';
  text: string;
  timestamp: Date;
}

interface AnalysisResult {
  type: string;
  amount?: number;
  recipient?: string;
  recipientName?: string;
  invoiceNumber?: string;
  dueDate?: string;
  confidence?: number;
  paid?: boolean;
  raw?: any;
}

interface PlaygroundContact {
  name: string;
  displayName: string;
  address: string;
  category: string;
  createdAt: string;
}

interface PlaygroundSubscription {
  name: string;
  displayName: string;
  address: string;
  amount: string;
  billingDay: number;
  nextDueDate: string;
  lastPaidDate?: string;
  lastPaidTxHash?: string;
}

type SubscriptionStatus = 'due' | 'upcoming' | 'paid' | 'overdue';

// Arc Testnet config (from env or defaults)
const DEMO_CONFIG = {
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID) || 5042002,
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL || 'https://rpc.testnet.arc.network',
  explorerUrl: 'https://testnet.arcscan.app',
  usdcAddress: process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x3600000000000000000000000000000000000000',
};

// Helper function to send real payment via API
async function sendPayment(to: string, amount: string): Promise<{ success: boolean; txHash?: string; error?: string; simulated?: boolean }> {
  try {
    const response = await fetch('/api/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, amount }),
    });
    const data = await response.json();
    if (data.error && !data.simulated) {
      return { success: false, error: data.error };
    }
    return { success: true, txHash: data.txHash, simulated: data.simulated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export default function PlaygroundPage() {
  const [mode, setMode] = useState<DemoMode>('ai-demo');
  const [aiSubMode, setAISubMode] = useState<AISubMode>('voice');
  const [paymentSubMode, setPaymentSubMode] = useState<PaymentSubMode>('contacts');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [showSettings, setShowSettings] = useState(false);

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceLogs, setVoiceLogs] = useState<LogEntry[]>([]);
  const recognitionRef = useRef<any>(null);

  // Image state
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Code state - default code template
  const getDefaultCode = () => `// ArcPay Interactive Playground
// Enter your code and click "Run" to execute

// Connect to Arc Testnet
const client = createPublicClient({
  chain: {
    id: ${DEMO_CONFIG.chainId},
    name: 'Arc Testnet',
    nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['${DEMO_CONFIG.rpcUrl}'] } },
  },
  transport: http(),
});

// Get block number
const blockNumber = await client.getBlockNumber();
console.log('Current block:', blockNumber);

// Check USDC balance (replace with your address)
const balance = await client.readContract({
  address: '${DEMO_CONFIG.usdcAddress}',
  abi: [{
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  }],
  functionName: 'balanceOf',
  args: ['0xF505e2E71df58D7244189072008f25f6b6aaE5ae'],
});

console.log('USDC Balance:', formatUnits(balance, 6));
`;
  const [code, setCode] = useState(getDefaultCode);
  const [codeOutput, setCodeOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedAPI, setSelectedAPI] = useState<APIItem | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<APICategory | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  // Console state
  const [consoleInput, setConsoleInput] = useState('');
  const [consoleLogs, setConsoleLogs] = useState<LogEntry[]>([
    { type: 'system', text: 'ArcPay Console v1.0 - Type "help" for commands', timestamp: new Date() },
  ]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Balance state
  const [demoBalance, setDemoBalance] = useState<string | null>(null);

  // Contacts state
  const [contacts, setContacts] = useState<PlaygroundContact[]>([]);
  const [newContactName, setNewContactName] = useState('');
  const [newContactAddress, setNewContactAddress] = useState('');
  const [newContactCategory, setNewContactCategory] = useState('personal');
  const [contactSearchQuery, setContactSearchQuery] = useState('');
  const [isAddingContact, setIsAddingContact] = useState(false);

  // Subscriptions state
  const [subscriptions, setSubscriptions] = useState<PlaygroundSubscription[]>([]);
  const [newSubName, setNewSubName] = useState('');
  const [newSubAddress, setNewSubAddress] = useState('');
  const [newSubAmount, setNewSubAmount] = useState('');
  const [newSubBillingDay, setNewSubBillingDay] = useState('15');
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [isPayingBill, setIsPayingBill] = useState<string | null>(null);

  // Load settings from localStorage or env
  useEffect(() => {
    const savedKey = localStorage.getItem('arcpay_gemini_key') || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
    const savedPk = localStorage.getItem('arcpay_demo_pk');
    if (savedKey) setGeminiApiKey(savedKey);
    if (savedPk) setPrivateKey(savedPk);

    // Load contacts from localStorage
    const savedContacts = localStorage.getItem('arcpay_contacts');
    if (savedContacts) {
      try {
        setContacts(JSON.parse(savedContacts));
      } catch {
        // Ignore parse errors
      }
    } else {
      // Demo contacts for first load
      const demoContacts: PlaygroundContact[] = [
        {
          name: 'ahmed',
          displayName: 'Ahmed',
          address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78',
          category: 'personal',
          createdAt: new Date().toISOString(),
        },
        {
          name: 'writer-bot',
          displayName: 'Writer Bot',
          address: '0xF505e2E71df58D7244189072008f25f6b6aaE5ae',
          category: 'agent',
          createdAt: new Date().toISOString(),
        },
        {
          name: 'netflix',
          displayName: 'Netflix',
          address: '0x8ba1f109551bD432803012645Ac136ddd64DBA72',
          category: 'subscription',
          createdAt: new Date().toISOString(),
        },
      ];
      setContacts(demoContacts);
      localStorage.setItem('arcpay_contacts', JSON.stringify(demoContacts));
    }

    // Load subscriptions from localStorage
    const savedSubs = localStorage.getItem('arcpay_subscriptions');
    if (savedSubs) {
      try {
        setSubscriptions(JSON.parse(savedSubs));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save settings to localStorage
  const saveSettings = () => {
    localStorage.setItem('arcpay_gemini_key', geminiApiKey);
    localStorage.setItem('arcpay_demo_pk', privateKey);
    setShowSettings(false);
    addVoiceLog('success', 'Settings saved!');
  };

  // Add log entry
  const addVoiceLog = (type: LogEntry['type'], text: string) => {
    setVoiceLogs(prev => [...prev, { type, text, timestamp: new Date() }]);
  };

  const addConsoleLog = (type: LogEntry['type'], text: string) => {
    setConsoleLogs(prev => [...prev, { type, text, timestamp: new Date() }]);
  };

  // ==================== VOICE MODE ====================
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      addVoiceLog('error', 'Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setVoiceLogs([]);
      addVoiceLog('system', '🎤 Listening...');
    };

    recognitionRef.current.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcriptText = event.results[current][0].transcript;
      setTranscript(transcriptText);

      if (event.results[current].isFinal) {
        addVoiceLog('user', `"${transcriptText}"`);
        processVoiceCommand(transcriptText);
      }
    };

    recognitionRef.current.onerror = (event: any) => {
      addVoiceLog('error', `Error: ${event.error}`);
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const processVoiceCommand = async (command: string) => {
    if (!geminiApiKey) {
      addVoiceLog('error', 'Please set your Gemini API key in settings');
      return;
    }

    addVoiceLog('ai', '🤖 Processing with Gemini...');

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const prompt = `You are a payment AI assistant. Parse this voice command and extract the intent.

Command: "${command}"

Extract and return JSON with:
- action: "pay" | "balance" | "escrow" | "stream" | "hire" | "unknown"
- amount: number or null
- recipient: string or null
- task: string or null (if hiring an agent)
- currency: "USDC" (default)

Only return valid JSON, no markdown.`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      // Parse JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        addVoiceLog('info', `Action: ${parsed.action}`);
        if (parsed.amount) addVoiceLog('info', `Amount: ${parsed.amount} ${parsed.currency || 'USDC'}`);
        if (parsed.recipient) addVoiceLog('info', `Recipient: ${parsed.recipient}`);
        if (parsed.task) addVoiceLog('info', `Task: ${parsed.task}`);

        // Resolve contact name to address
        if (parsed.recipient) {
          const resolvedAddress = resolveRecipient(parsed.recipient);
          if (resolvedAddress) {
            if (!parsed.recipient.startsWith('0x')) {
              addVoiceLog('info', `Contact resolved: "${parsed.recipient}" -> ${resolvedAddress.slice(0, 10)}...`);
            }
            parsed.recipient = resolvedAddress;
          } else if (!parsed.recipient.startsWith('0x')) {
            addVoiceLog('error', `Contact "${parsed.recipient}" not found. Add them first!`);
            speakResponse(`Contact ${parsed.recipient} not found. Please add them first.`);
            return;
          }
        }

        // Execute real blockchain action
        addVoiceLog('ai', 'Executing on Arc blockchain...');

        if (parsed.action === 'pay' && parsed.amount) {
          const recipient = parsed.recipient || '0xF505e2E71df58D7244189072008f25f6b6aaE5ae';
          const result = await sendPayment(recipient, parsed.amount.toString());
          if (result.success) {
            const simText = result.simulated ? ' (simulated)' : '';
            addVoiceLog('success', `✅ Sent ${parsed.amount} USDC to ${recipient.slice(0, 10)}...${simText}`);
            addVoiceLog('info', `TX: ${result.txHash?.slice(0, 20)}...`);
            speakResponse(`Successfully sent ${parsed.amount} USDC`);
          } else {
            addVoiceLog('error', `❌ Payment failed: ${result.error}`);
            speakResponse(`Payment failed: ${result.error}`);
          }
        } else if (parsed.action === 'balance') {
          addVoiceLog('success', `✅ Your balance is ${demoBalance || '1000'} USDC`);
          speakResponse(`Your balance is ${demoBalance || '1000'} USDC`);
        } else if (parsed.action === 'hire') {
          const recipient = parsed.recipient || '0xF505e2E71df58D7244189072008f25f6b6aaE5ae';
          const result = await sendPayment(recipient, (parsed.amount || 50).toString());
          if (result.success) {
            const simText = result.simulated ? ' (simulated)' : '';
            addVoiceLog('success', `✅ Hired agent for ${parsed.amount || 50} USDC - Task: ${parsed.task || 'task'}${simText}`);
            addVoiceLog('info', `TX: ${result.txHash?.slice(0, 20)}...`);
            speakResponse(`Agent hired successfully for ${parsed.amount || 50} USDC`);
          } else {
            addVoiceLog('error', `❌ Hiring failed: ${result.error}`);
          }
        } else {
          addVoiceLog('info', `Parsed intent: ${JSON.stringify(parsed)}`);
        }
      } else {
        addVoiceLog('error', 'Could not parse response');
      }
    } catch (error: any) {
      addVoiceLog('error', `Gemini error: ${error.message}`);
    }
  };

  const speakResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Resolve contact name to address
  const resolveRecipient = (nameOrAddress: string): string | null => {
    // Already an address, return it
    if (nameOrAddress.startsWith('0x') && nameOrAddress.length === 42) {
      return nameOrAddress;
    }

    // Search in contacts (case-insensitive)
    const normalizedName = nameOrAddress.toLowerCase().trim();
    const contact = contacts.find(c =>
      c.name.toLowerCase() === normalizedName ||
      c.displayName.toLowerCase() === normalizedName
    );

    return contact?.address || null;
  };

  // ==================== CONTACTS MODE ====================
  const saveContacts = (newContacts: PlaygroundContact[]) => {
    setContacts(newContacts);
    localStorage.setItem('arcpay_contacts', JSON.stringify(newContacts));
  };

  const addContact = () => {
    if (!newContactName.trim() || !newContactAddress.trim()) {
      alert('Please enter both name and address');
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(newContactAddress)) {
      alert('Please enter a valid Ethereum address (0x...)');
      return;
    }

    const normalizedName = newContactName.toLowerCase().trim().replace(/\s+/g, '-');
    if (contacts.some(c => c.name === normalizedName)) {
      alert('Contact with this name already exists');
      return;
    }

    const newContact: PlaygroundContact = {
      name: normalizedName,
      displayName: newContactName.trim(),
      address: newContactAddress.toLowerCase(),
      category: newContactCategory,
      createdAt: new Date().toISOString(),
    };

    saveContacts([...contacts, newContact]);
    setNewContactName('');
    setNewContactAddress('');
    setNewContactCategory('personal');
    setIsAddingContact(false);
  };

  const deleteContact = (name: string) => {
    if (confirm(`Delete contact "${name}"?`)) {
      saveContacts(contacts.filter(c => c.name !== name));
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    // Brief visual feedback handled by UI
  };

  const filteredContacts = contacts.filter(c =>
    c.displayName.toLowerCase().includes(contactSearchQuery.toLowerCase()) ||
    c.address.toLowerCase().includes(contactSearchQuery.toLowerCase())
  );

  const categoryColors: Record<string, string> = {
    personal: 'bg-blue-500/20 text-blue-400',
    business: 'bg-cyan-500/20 text-cyan-400',
    subscription: 'bg-amber-500/20 text-amber-400',
    merchant: 'bg-emerald-500/20 text-emerald-400',
    agent: 'bg-cyan-500/20 text-cyan-400',
    other: 'bg-gray-500/20 text-gray-400',
  };

  // ==================== SUBSCRIPTIONS ====================
  const saveSubscriptions = (newSubs: PlaygroundSubscription[]) => {
    setSubscriptions(newSubs);
    localStorage.setItem('arcpay_subscriptions', JSON.stringify(newSubs));
  };

  const calculateNextDueDate = (billingDay: number, lastPaidDate?: string): string => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // If paid this month, next due is next month
    if (lastPaidDate) {
      const paidDate = new Date(lastPaidDate);
      if (paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear) {
        const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
        const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
        const daysInMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
        const day = Math.min(billingDay, daysInMonth);
        return new Date(nextYear, nextMonth, day).toISOString();
      }
    }

    // Check if this month's billing day has passed
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const effectiveBillingDay = Math.min(billingDay, daysInCurrentMonth);
    const thisMonthDue = new Date(currentYear, currentMonth, effectiveBillingDay);

    if (today > thisMonthDue) {
      // Past this month's due date, next is next month
      const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
      const daysInNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
      const day = Math.min(billingDay, daysInNextMonth);
      return new Date(nextYear, nextMonth, day).toISOString();
    }

    return thisMonthDue.toISOString();
  };

  const getSubscriptionStatus = (sub: PlaygroundSubscription): SubscriptionStatus => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(sub.nextDueDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Check if paid this month
    if (sub.lastPaidDate) {
      const paidDate = new Date(sub.lastPaidDate);
      if (paidDate.getMonth() === today.getMonth() && paidDate.getFullYear() === today.getFullYear()) {
        return 'paid';
      }
    }

    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'due';
    if (diffDays <= 7) return 'upcoming';
    return 'upcoming';
  };

  const getStatusColor = (status: SubscriptionStatus): string => {
    switch (status) {
      case 'due': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'overdue': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'paid': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'upcoming': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  const getStatusIcon = (status: SubscriptionStatus): string => {
    switch (status) {
      case 'due': return '⚠️';
      case 'overdue': return '🔴';
      case 'paid': return '✅';
      case 'upcoming': return '📅';
    }
  };

  const addSubscription = () => {
    if (!newSubName.trim() || !newSubAddress.trim() || !newSubAmount.trim()) {
      alert('Please fill all fields');
      return;
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(newSubAddress)) {
      alert('Please enter a valid Ethereum address (0x...)');
      return;
    }

    const billingDay = parseInt(newSubBillingDay);
    if (isNaN(billingDay) || billingDay < 1 || billingDay > 31) {
      alert('Billing day must be between 1 and 31');
      return;
    }

    const normalizedName = newSubName.toLowerCase().trim().replace(/\s+/g, '-');
    if (subscriptions.some(s => s.name === normalizedName)) {
      alert('Subscription with this name already exists');
      return;
    }

    const newSub: PlaygroundSubscription = {
      name: normalizedName,
      displayName: newSubName.trim(),
      address: newSubAddress.toLowerCase(),
      amount: newSubAmount,
      billingDay,
      nextDueDate: calculateNextDueDate(billingDay),
    };

    saveSubscriptions([...subscriptions, newSub]);
    setNewSubName('');
    setNewSubAddress('');
    setNewSubAmount('');
    setNewSubBillingDay('15');
    setIsAddingSub(false);
  };

  const deleteSubscription = (name: string) => {
    if (confirm(`Delete subscription "${name}"?`)) {
      saveSubscriptions(subscriptions.filter(s => s.name !== name));
    }
  };

  const paySubscription = async (sub: PlaygroundSubscription) => {
    setIsPayingBill(sub.name);
    try {
      const result = await sendPayment(sub.address, sub.amount);
      if (result.success) {
        const now = new Date().toISOString();
        const updated = subscriptions.map(s =>
          s.name === sub.name
            ? {
                ...s,
                lastPaidDate: now,
                lastPaidTxHash: result.txHash,
                nextDueDate: calculateNextDueDate(s.billingDay, now),
              }
            : s
        );
        saveSubscriptions(updated);
        alert(`Paid ${sub.displayName}! TX: ${result.txHash?.slice(0, 20)}...`);
      } else {
        alert(`Payment failed: ${result.error}`);
      }
    } finally {
      setIsPayingBill(null);
    }
  };

  const payAllDue = async () => {
    const dueSubs = subscriptions.filter(s => {
      const status = getSubscriptionStatus(s);
      return status === 'due' || status === 'overdue';
    });

    if (dueSubs.length === 0) {
      alert('No bills due!');
      return;
    }

    if (!confirm(`Pay ${dueSubs.length} bills totaling $${dueSubs.reduce((sum, s) => sum + parseFloat(s.amount), 0).toFixed(2)}?`)) {
      return;
    }

    for (const sub of dueSubs) {
      await paySubscription(sub);
    }
  };

  const snoozeSubscription = (name: string, days: number) => {
    const updated = subscriptions.map(s => {
      if (s.name === name) {
        const currentDue = new Date(s.nextDueDate);
        currentDue.setDate(currentDue.getDate() + days);
        return { ...s, nextDueDate: currentDue.toISOString() };
      }
      return s;
    });
    saveSubscriptions(updated);
  };

  const getMonthlyTotal = (): string => {
    return subscriptions.reduce((sum, s) => sum + parseFloat(s.amount), 0).toFixed(2);
  };

  const getDueBills = (): PlaygroundSubscription[] => {
    return subscriptions.filter(s => {
      const status = getSubscriptionStatus(s);
      return status === 'due' || status === 'overdue';
    });
  };

  const getUpcomingBills = (): PlaygroundSubscription[] => {
    return subscriptions.filter(s => getSubscriptionStatus(s) === 'upcoming');
  };

  const getPaidBills = (): PlaygroundSubscription[] => {
    return subscriptions.filter(s => getSubscriptionStatus(s) === 'paid');
  };

  // ==================== IMAGE MODE ====================
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
        setAnalysisResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async () => {
    if (!uploadedImage || !geminiApiKey) {
      if (!geminiApiKey) alert('Please set your Gemini API key in settings');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(geminiApiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      // Convert image to base64
      const base64Data = uploadedImage.split(',')[1];

      const prompt = `Analyze this image. If it's an invoice or receipt, extract:
- amount (number)
- recipient or vendor name
- recipient address (if visible, looks like 0x...)
- invoice number
- due date

If it's a delivery photo, analyze:
- is package visible
- location description
- confidence score (0-100)

Return JSON only, no markdown:
{
  "type": "invoice" | "receipt" | "delivery" | "unknown",
  "amount": number or null,
  "recipient": "name" or null,
  "recipientAddress": "0x..." or null,
  "invoiceNumber": "string" or null,
  "dueDate": "string" or null,
  "confidence": number (0-100),
  "description": "brief description"
}`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: imageFile?.type || 'image/jpeg',
            data: base64Data,
          },
        },
      ]);

      const responseText = result.response.text();
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        setAnalysisResult({
          type: parsed.type,
          amount: parsed.amount,
          recipient: parsed.recipientAddress || parsed.recipient,
          recipientName: parsed.recipient,
          invoiceNumber: parsed.invoiceNumber,
          dueDate: parsed.dueDate,
          confidence: parsed.confidence,
          raw: parsed,
        });
      }
    } catch (error: any) {
      alert(`Analysis error: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const [isPayingInvoice, setIsPayingInvoice] = useState(false);
  const [paymentTxHash, setPaymentTxHash] = useState<string | null>(null);

  const payInvoice = async () => {
    if (!analysisResult?.amount) return;

    setIsPayingInvoice(true);
    const recipient = analysisResult.recipient || '0xF505e2E71df58D7244189072008f25f6b6aaE5ae';

    const result = await sendPayment(recipient, analysisResult.amount.toString());

    if (result.success) {
      setPaymentTxHash(result.txHash || null);
      setAnalysisResult(prev => prev ? { ...prev, paid: true } : null);
      const simText = result.simulated ? ' (simulated)' : '';
      speakResponse(`Payment of ${analysisResult.amount} USDC sent successfully${simText}`);
    } else {
      alert(`Payment failed: ${result.error}`);
    }
    setIsPayingInvoice(false);
  };

  // ==================== CODE MODE ====================
  const runCode = async () => {
    setIsRunning(true);
    setCodeOutput([]);

    // Create a custom console.log that captures output
    const logs: string[] = [];
    const customConsole = {
      log: (...args: any[]) => {
        const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ');
        logs.push(msg);
        setCodeOutput([...logs]);
      },
      error: (...args: any[]) => {
        const msg = '❌ ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
        logs.push(msg);
        setCodeOutput([...logs]);
      },
    };

    try {
      // Import viem dynamically
      const viem = await import('viem');
      const { createPublicClient, createWalletClient, http, formatUnits, parseUnits, defineChain } = viem;
      const { privateKeyToAccount } = await import('viem/accounts');

      // Define Arc Testnet chain
      const arcTestnet = defineChain({
        id: 5042002,
        name: 'Arc Testnet',
        nativeCurrency: { name: 'USDC', symbol: 'USDC', decimals: 18 },
        rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
        blockExplorers: { default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' } },
      });

      // Contract addresses on Arc Testnet
      const CONTRACTS = {
        usdc: '0x3600000000000000000000000000000000000000' as `0x${string}`,
        eurc: '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a' as `0x${string}`,
        usyc: '0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C' as `0x${string}`,
        escrow: '0x0a982E2250F1C66487b88286e14D965025dD89D2' as `0x${string}`,
        stream: '0x4678D992De548bddCb5Cd4104470766b5207A855' as `0x${string}`,
        channel: '0x3FF7bC1C52e7DdD2B7B915bDAdBe003037B0FA2E' as `0x${string}`,
        stealth: '0xbC6d02dBDe96caE69680BDbB63f9A12a14F3a41B' as `0x${string}`,
        agent: '0xF7edaD804760cfDD4050ca9623BFb421Cc2Fe2cf' as `0x${string}`,
      };

      // ABIs (minimal for playground)
      const ERC20_ABI = [
        { name: 'balanceOf', type: 'function', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
        { name: 'transfer', type: 'function', inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
        { name: 'approve', type: 'function', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'nonpayable' },
      ] as const;

      // ABIs updated for native USDC (payable functions)
      const ESCROW_ABI = [
        { name: 'createAndFundEscrow', type: 'function', inputs: [{ name: 'beneficiary', type: 'address' }, { name: 'arbiter', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'expiresAt', type: 'uint256' }, { name: 'conditionHash', type: 'string' }], outputs: [{ name: '', type: 'bytes32' }], stateMutability: 'payable' },
        { name: 'releaseEscrow', type: 'function', inputs: [{ name: 'escrowId', type: 'bytes32' }], outputs: [], stateMutability: 'nonpayable' },
        { name: 'refundEscrow', type: 'function', inputs: [{ name: 'escrowId', type: 'bytes32' }], outputs: [], stateMutability: 'nonpayable' },
        { name: 'getEscrow', type: 'function', inputs: [{ name: 'escrowId', type: 'bytes32' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'id', type: 'bytes32' }, { name: 'depositor', type: 'address' }, { name: 'beneficiary', type: 'address' }, { name: 'arbiter', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'fundedAt', type: 'uint256' }, { name: 'expiresAt', type: 'uint256' }, { name: 'state', type: 'uint8' }] }], stateMutability: 'view' },
      ] as const;

      const STREAM_ABI = [
        { name: 'createStream', type: 'function', inputs: [{ name: 'recipient', type: 'address' }, { name: 'totalAmount', type: 'uint256' }, { name: 'duration', type: 'uint256' }], outputs: [{ name: '', type: 'bytes32' }], stateMutability: 'payable' },
        { name: 'claim', type: 'function', inputs: [{ name: 'streamId', type: 'bytes32' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'nonpayable' },
        { name: 'cancelStream', type: 'function', inputs: [{ name: 'streamId', type: 'bytes32' }], outputs: [], stateMutability: 'nonpayable' },
        { name: 'getClaimableAmount', type: 'function', inputs: [{ name: 'streamId', type: 'bytes32' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
        { name: 'getStream', type: 'function', inputs: [{ name: 'streamId', type: 'bytes32' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'id', type: 'bytes32' }, { name: 'sender', type: 'address' }, { name: 'recipient', type: 'address' }, { name: 'totalAmount', type: 'uint256' }, { name: 'claimedAmount', type: 'uint256' }, { name: 'ratePerSecond', type: 'uint256' }, { name: 'startTime', type: 'uint256' }, { name: 'endTime', type: 'uint256' }, { name: 'state', type: 'uint8' }] }], stateMutability: 'view' },
      ] as const;

      const CHANNEL_ABI = [
        { name: 'openChannel', type: 'function', inputs: [{ name: 'recipient', type: 'address' }, { name: 'deposit', type: 'uint256' }], outputs: [{ name: '', type: 'bytes32' }], stateMutability: 'payable' },
        { name: 'closeChannel', type: 'function', inputs: [{ name: 'channelId', type: 'bytes32' }, { name: 'spent', type: 'uint256' }, { name: 'nonce', type: 'uint256' }, { name: 'signature', type: 'bytes' }], outputs: [], stateMutability: 'nonpayable' },
        { name: 'getChannel', type: 'function', inputs: [{ name: 'channelId', type: 'bytes32' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'id', type: 'bytes32' }, { name: 'sender', type: 'address' }, { name: 'recipient', type: 'address' }, { name: 'deposit', type: 'uint256' }, { name: 'spent', type: 'uint256' }, { name: 'nonce', type: 'uint256' }, { name: 'state', type: 'uint8' }] }], stateMutability: 'view' },
        { name: 'getChannelBalance', type: 'function', inputs: [{ name: 'channelId', type: 'bytes32' }], outputs: [{ name: 'available', type: 'uint256' }, { name: 'spent', type: 'uint256' }], stateMutability: 'view' },
      ] as const;

      const AGENT_ABI = [
        { name: 'registerAgent', type: 'function', inputs: [{ name: 'agent', type: 'address' }, { name: 'dailyBudget', type: 'uint256' }, { name: 'perTxLimit', type: 'uint256' }], outputs: [], stateMutability: 'nonpayable' },
        { name: 'executePayment', type: 'function', inputs: [{ name: 'recipient', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'memo', type: 'string' }], outputs: [], stateMutability: 'payable' },
        { name: 'depositFunds', type: 'function', inputs: [{ name: 'agent', type: 'address' }], outputs: [], stateMutability: 'payable' },
        { name: 'getAgentConfig', type: 'function', inputs: [{ name: 'agent', type: 'address' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'owner', type: 'address' }, { name: 'dailyBudget', type: 'uint256' }, { name: 'perTxLimit', type: 'uint256' }, { name: 'todaySpent', type: 'uint256' }, { name: 'lastResetTimestamp', type: 'uint256' }, { name: 'active', type: 'bool' }] }], stateMutability: 'view' },
        { name: 'getAgentBalance', type: 'function', inputs: [{ name: 'agent', type: 'address' }], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
      ] as const;

      const STEALTH_ABI = [
        { name: 'registerMetaAddress', type: 'function', inputs: [{ name: 'spendingPubKey', type: 'bytes' }, { name: 'viewingPubKey', type: 'bytes' }], outputs: [], stateMutability: 'nonpayable' },
        { name: 'sendStealthPayment', type: 'function', inputs: [{ name: 'stealthAddress', type: 'address' }, { name: 'ephemeralPubKey', type: 'bytes' }, { name: 'encryptedMemo', type: 'bytes' }], outputs: [{ name: '', type: 'bytes32' }], stateMutability: 'payable' },
        { name: 'getMetaAddress', type: 'function', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'tuple', components: [{ name: 'spendingPubKey', type: 'bytes' }, { name: 'viewingPubKey', type: 'bytes' }, { name: 'registeredAt', type: 'uint256' }, { name: 'active', type: 'bool' }] }], stateMutability: 'view' },
        { name: 'isRegistered', type: 'function', inputs: [{ name: 'user', type: 'address' }], outputs: [{ name: '', type: 'bool' }], stateMutability: 'view' },
        { name: 'getAnnouncements', type: 'function', inputs: [{ name: 'fromIndex', type: 'uint256' }, { name: 'count', type: 'uint256' }], outputs: [{ name: '', type: 'tuple[]', components: [{ name: 'id', type: 'bytes32' }, { name: 'stealthAddress', type: 'address' }, { name: 'amount', type: 'uint256' }, { name: 'ephemeralPubKey', type: 'bytes' }, { name: 'encryptedMemo', type: 'bytes' }, { name: 'timestamp', type: 'uint256' }, { name: 'claimed', type: 'bool' }] }], stateMutability: 'view' },
        { name: 'getTotalAnnouncements', type: 'function', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view' },
        { name: 'markClaimed', type: 'function', inputs: [{ name: 'announcementId', type: 'bytes32' }], outputs: [], stateMutability: 'nonpayable' },
      ] as const;

      // Create ArcPay that works in browser with REAL on-chain calls
      const createArcPayMock = (config: any) => {
        const rpcUrl = 'https://rpc.testnet.arc.network';

        const publicClient = createPublicClient({
          chain: arcTestnet,
          transport: http(rpcUrl),
        });

        let walletClient: any = null;
        let account: any = null;

        if (config.privateKey) {
          // Auto-add 0x prefix if missing
          let pk = config.privateKey as string;
          if (!pk.startsWith('0x')) {
            pk = '0x' + pk;
          }
          account = privateKeyToAccount(pk as `0x${string}`);
          walletClient = createWalletClient({
            account,
            chain: arcTestnet,
            transport: http(rpcUrl),
          });
        }

        const requireWallet = () => {
          if (!walletClient || !account) throw new Error('Private key required. Set it in Settings (⚙️)');
        };

        const approveUSDC = async (spender: `0x${string}`, amount: bigint) => {
          requireWallet();
          const hash = await walletClient.writeContract({
            address: CONTRACTS.usdc,
            abi: ERC20_ABI,
            functionName: 'approve',
            args: [spender, amount],
          });
          await publicClient.waitForTransactionReceipt({ hash });
          return hash;
        };

        return {
          network: { name: 'Arc Testnet', chainId: 5042002 },
          address: account?.address || 'Read-only mode (no private key)',
          contracts: CONTRACTS,

          // ==================== CORE ====================
          async getBalance(addr?: string) {
            const target = (addr || account?.address) as `0x${string}`;
            if (!target || target.includes('Read-only')) return '0';
            // On Arc, USDC is native - use getBalance for native balance (18 decimals)
            const balance = await publicClient.getBalance({ address: target });
            return formatUnits(balance, 18);
          },

          async sendUSDC(to: string, amount: string) {
            requireWallet();
            // On Arc, USDC is the native gas token with 18 decimals
            // Use native transfer instead of ERC-20 transfer for reliability
            const amountWei = parseUnits(amount, 18);
            const hash = await walletClient.sendTransaction({
              to: to as `0x${string}`,
              value: amountWei,
            });
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            return { success: true, txHash: hash, blockNumber: receipt.blockNumber, explorerUrl: `https://testnet.arcscan.app/tx/${hash}` };
          },

          // ==================== EURC (ERC-20 Token) ====================
          async getEURCBalance(addr?: string) {
            const target = (addr || account?.address) as `0x${string}`;
            if (!target || target.includes('Read-only')) return '0';
            const balance = await publicClient.readContract({
              address: CONTRACTS.eurc,
              abi: ERC20_ABI,
              functionName: 'balanceOf',
              args: [target],
            });
            return formatUnits(balance as bigint, 6);
          },

          async sendEURC(to: string, amount: string) {
            requireWallet();
            const amountWei = parseUnits(amount, 6);
            const hash = await walletClient.writeContract({
              address: CONTRACTS.eurc,
              abi: ERC20_ABI,
              functionName: 'transfer',
              args: [to as `0x${string}`, amountWei],
            });
            const receipt = await publicClient.waitForTransactionReceipt({ hash });
            return { success: true, txHash: hash, blockNumber: receipt.blockNumber, explorerUrl: `https://testnet.arcscan.app/tx/${hash}` };
          },

          // ==================== ESCROW (REAL ON-CHAIN with native USDC) ====================
          escrow: {
            async create(params: { beneficiary: string; arbiter?: string; amount: string; expiresIn?: number; description?: string }) {
              requireWallet();
              // Use 18 decimals for Arc's native USDC
              const amountWei = parseUnits(params.amount, 18);
              const expiresAt = BigInt(Math.floor(Date.now() / 1000) + (params.expiresIn || 7 * 24 * 60 * 60));
              const arbiter = params.arbiter || account.address;

              // Create and fund escrow with native value (no approve needed)
              const hash = await walletClient.writeContract({
                address: CONTRACTS.escrow,
                abi: ESCROW_ABI,
                functionName: 'createAndFundEscrow',
                args: [params.beneficiary as `0x${string}`, arbiter as `0x${string}`, amountWei, expiresAt, params.description || ''],
                value: amountWei,
              });
              const receipt = await publicClient.waitForTransactionReceipt({ hash });
              return { success: true, txHash: hash, blockNumber: receipt.blockNumber, explorerUrl: `https://testnet.arcscan.app/tx/${hash}` };
            },

            async release(escrowId: string) {
              requireWallet();
              const hash = await walletClient.writeContract({
                address: CONTRACTS.escrow,
                abi: ESCROW_ABI,
                functionName: 'releaseEscrow',
                args: [escrowId as `0x${string}`],
              });
              const receipt = await publicClient.waitForTransactionReceipt({ hash });
              return { success: true, txHash: hash, blockNumber: receipt.blockNumber };
            },

            async refund(escrowId: string) {
              requireWallet();
              const hash = await walletClient.writeContract({
                address: CONTRACTS.escrow,
                abi: ESCROW_ABI,
                functionName: 'refundEscrow',
                args: [escrowId as `0x${string}`],
              });
              const receipt = await publicClient.waitForTransactionReceipt({ hash });
              return { success: true, txHash: hash, blockNumber: receipt.blockNumber };
            },

            async get(escrowId: string) {
              const data = await publicClient.readContract({
                address: CONTRACTS.escrow,
                abi: ESCROW_ABI,
                functionName: 'getEscrow',
                args: [escrowId as `0x${string}`],
              });
              return data;
            },
          },

          // ==================== STREAMS (REAL ON-CHAIN with native USDC) ====================
          streams: {
            async create(params: { recipient: string; amount: string; duration: number }) {
              requireWallet();
              // Use 18 decimals for Arc's native USDC
              const amountWei = parseUnits(params.amount, 18);

              // Create stream with native value (no approve needed)
              const hash = await walletClient.writeContract({
                address: CONTRACTS.stream,
                abi: STREAM_ABI,
                functionName: 'createStream',
                args: [params.recipient as `0x${string}`, amountWei, BigInt(params.duration)],
                value: amountWei,
              });
              const receipt = await publicClient.waitForTransactionReceipt({ hash });

              // Extract stream ID from StreamCreated event logs
              const streamLog = receipt.logs.find(log =>
                log.address.toLowerCase() === CONTRACTS.stream.toLowerCase()
              );
              const streamId = streamLog?.topics[1] || null;

              return {
                success: true,
                streamId,
                txHash: hash,
                blockNumber: receipt.blockNumber,
                explorerUrl: `https://testnet.arcscan.app/tx/${hash}`,
              };
            },

            async claim(streamId: string) {
              requireWallet();
              const hash = await walletClient.writeContract({
                address: CONTRACTS.stream,
                abi: STREAM_ABI,
                functionName: 'claim',
                args: [streamId as `0x${string}`],
              });
              const receipt = await publicClient.waitForTransactionReceipt({ hash });
              return { success: true, txHash: hash, blockNumber: receipt.blockNumber, explorerUrl: `https://testnet.arcscan.app/tx/${hash}` };
            },

            async cancel(streamId: string) {
              requireWallet();
              const hash = await walletClient.writeContract({
                address: CONTRACTS.stream,
                abi: STREAM_ABI,
                functionName: 'cancelStream',
                args: [streamId as `0x${string}`],
              });
              const receipt = await publicClient.waitForTransactionReceipt({ hash });
              return { success: true, txHash: hash, blockNumber: receipt.blockNumber, explorerUrl: `https://testnet.arcscan.app/tx/${hash}` };
            },

            async getClaimable(streamId: string) {
              const amount = await publicClient.readContract({
                address: CONTRACTS.stream,
                abi: STREAM_ABI,
                functionName: 'getClaimableAmount',
                args: [streamId as `0x${string}`],
              });
              // Use 18 decimals for Arc's native USDC
              return formatUnits(amount as bigint, 18);
            },

            async get(streamId: string) {
              const data = await publicClient.readContract({
                address: CONTRACTS.stream,
                abi: STREAM_ABI,
                functionName: 'getStream',
                args: [streamId as `0x${string}`],
              });
              return data;
            },
          },

          // ==================== CHANNELS (REAL ON-CHAIN with native USDC) ====================
          channels: {
            async open(params: { recipient: string; deposit: string }) {
              requireWallet();
              // Use 18 decimals for Arc's native USDC
              const depositWei = parseUnits(params.deposit, 18);

              // Open channel with native value (no approve needed)
              const hash = await walletClient.writeContract({
                address: CONTRACTS.channel,
                abi: CHANNEL_ABI,
                functionName: 'openChannel',
                args: [params.recipient as `0x${string}`, depositWei],
                value: depositWei,
              });
              const receipt = await publicClient.waitForTransactionReceipt({ hash });
              return { success: true, txHash: hash, blockNumber: receipt.blockNumber, explorerUrl: `https://testnet.arcscan.app/tx/${hash}` };
            },

            async getBalance(channelId: string) {
              const data = await publicClient.readContract({
                address: CONTRACTS.channel,
                abi: CHANNEL_ABI,
                functionName: 'getChannelBalance',
                args: [channelId as `0x${string}`],
              });
              // Use 18 decimals for Arc's native USDC
              return { available: formatUnits((data as any).available, 18), spent: formatUnits((data as any).spent, 18) };
            },

            async get(channelId: string) {
              const data = await publicClient.readContract({
                address: CONTRACTS.channel,
                abi: CHANNEL_ABI,
                functionName: 'getChannel',
                args: [channelId as `0x${string}`],
              });
              return data;
            },
          },

          // ==================== MICROPAYMENTS (x402 Protocol) ====================
          micropayments: {
            async pay<T>(url: string, options?: { maxPrice?: string }): Promise<T> {
              // Demo: Make paid request to paywalled endpoint
              console.log(`[Micropayments] Paying for access to: ${url}`);
              try {
                // First, check if endpoint requires payment (402 response)
                const checkRes = await fetch(url, { method: 'HEAD' }).catch(() => null);

                // Simulate x402 payment flow
                const paymentInfo = {
                  url,
                  price: options?.maxPrice || '0.01',
                  paidAt: new Date().toISOString(),
                };

                console.log(`[Micropayments] Paid ${paymentInfo.price} USDC for access`);

                // Return mock data (in real SDK, this would fetch the actual content)
                return { success: true, url, paid: paymentInfo.price } as T;
              } catch (e: any) {
                throw new Error(`Micropayment failed: ${e.message}`);
              }
            },

            async fetch(url: string, options?: { maxPrice?: string }) {
              const data = await this.pay(url, options);
              return { success: true, data, response: { status: 200 } };
            },

            paywall(payTo: string, routes: Record<string, { price: string; description?: string }>) {
              console.log(`[Micropayments] Paywall configured for ${Object.keys(routes).length} routes`);
              console.log(`[Micropayments] Payments go to: ${payTo}`);
              return (req: any, res: any, next: () => void) => {
                // This would be Express/Hono middleware in real SDK
                console.log('[Micropayments] Middleware: checking payment...');
                next();
              };
            },

            getBuyer() {
              return {
                payAndGet: this.pay.bind(this),
                payAndFetch: this.fetch.bind(this),
              };
            },
          },

          // ==================== PAYMASTER (Gas Sponsorship) ====================
          paymaster: {
            _rules: {
              maxPerTransaction: '0.01',
              maxPerUserDaily: '1.00',
              dailyBudget: '100.00',
              allowedContracts: [] as string[],
            },
            _userSpending: new Map<string, { today: number; total: number }>(),
            _totalSpent: 0,

            setRules(rules: { maxPerTransaction?: string; maxPerUserDaily?: string; dailyBudget?: string; allowedContracts?: string[] }) {
              this._rules = { ...this._rules, ...rules };
              console.log('[Paymaster] Rules updated:', this._rules);
            },

            getRules() {
              return { ...this._rules };
            },

            async sponsorTransaction(request: { userAddress: string; to: string; data?: string; value?: string }) {
              requireWallet();
              const { userAddress, to, data, value } = request;

              // Check rules
              const estimatedGas = '0.001'; // Mock gas estimate
              if (parseFloat(estimatedGas) > parseFloat(this._rules.maxPerTransaction)) {
                return { success: false, error: 'Exceeds per-transaction limit' };
              }

              // Track spending
              const userStats = this._userSpending.get(userAddress) || { today: 0, total: 0 };
              if (userStats.today + parseFloat(estimatedGas) > parseFloat(this._rules.maxPerUserDaily)) {
                return { success: false, error: 'User daily limit exceeded' };
              }

              // Execute sponsored transaction
              try {
                const hash = await walletClient.sendTransaction({
                  to: to as `0x${string}`,
                  data: (data || '0x') as `0x${string}`,
                  value: value ? parseUnits(value, 18) : BigInt(0),
                });
                const receipt = await publicClient.waitForTransactionReceipt({ hash });

                // Update spending
                userStats.today += parseFloat(estimatedGas);
                userStats.total += parseFloat(estimatedGas);
                this._userSpending.set(userAddress, userStats);
                this._totalSpent += parseFloat(estimatedGas);

                return {
                  success: true,
                  txHash: hash,
                  sponsoredAmount: estimatedGas,
                  explorerUrl: `https://testnet.arcscan.app/tx/${hash}`,
                };
              } catch (e: any) {
                return { success: false, error: e.message };
              }
            },

            getUserStats(address: string) {
              return this._userSpending.get(address) || { today: 0, total: 0 };
            },

            getStats() {
              return {
                totalSpent: this._totalSpent,
                uniqueUsers: this._userSpending.size,
                rules: this._rules,
              };
            },

            resetDailyLimits() {
              this._userSpending.forEach((stats) => { stats.today = 0; });
              console.log('[Paymaster] Daily limits reset');
            },

            isConfigured() {
              return !!walletClient;
            },
          },

          // ==================== USYC (Yield Token) ====================
          usyc: {
            _mockBalance: '0',
            _mockYield: '0',

            isAvailable() {
              return true; // Arc Testnet has USYC
            },

            getStatus() {
              return {
                available: true,
                contractAddress: CONTRACTS.usyc,
                tellerAddress: '0x...', // Teller contract
              };
            },

            async getExchangeRate() {
              // Mock rate: 1 USYC = 1.0234 USDC (accumulated yield)
              return '1.0234';
            },

            async isAllowlisted(address?: string) {
              // In demo, everyone is allowlisted
              return true;
            },

            async getBalance(address?: string) {
              const target = (address || account?.address) as `0x${string}`;
              if (!target || target.includes('Read-only')) {
                return { usyc: '0', usdcValue: '0', yield: '0' };
              }

              try {
                const balance = await publicClient.readContract({
                  address: CONTRACTS.usyc,
                  abi: ERC20_ABI,
                  functionName: 'balanceOf',
                  args: [target],
                });
                const usycBalance = formatUnits(balance as bigint, 6);
                const rate = 1.0234;
                const usdcValue = (parseFloat(usycBalance) * rate).toFixed(6);
                const yieldEarned = (parseFloat(usycBalance) * (rate - 1)).toFixed(6);

                return {
                  usyc: usycBalance,
                  usdcValue,
                  yield: yieldEarned,
                };
              } catch {
                return { usyc: '0', usdcValue: '0', yield: '0' };
              }
            },

            async subscribe(amount: string, options?: { slippage?: number }) {
              requireWallet();
              // Subscribe USDC to get USYC
              console.log(`[USYC] Subscribing ${amount} USDC...`);

              // This would interact with USYC Teller contract
              // For demo, we show the flow
              return {
                success: true,
                usycReceived: amount, // 1:1 for new subscriptions
                txHash: `0x${Date.now().toString(16)}...`,
                explorerUrl: `https://testnet.arcscan.app/tx/0x...`,
                message: 'Demo: USYC subscription simulated',
              };
            },

            async redeem(amount: string, options?: { slippage?: number }) {
              requireWallet();
              // Redeem USYC to get USDC + yield
              console.log(`[USYC] Redeeming ${amount} USYC...`);

              const rate = 1.0234;
              const usdcReceived = (parseFloat(amount) * rate).toFixed(6);

              return {
                success: true,
                usdcReceived,
                txHash: `0x${Date.now().toString(16)}...`,
                explorerUrl: `https://testnet.arcscan.app/tx/0x...`,
                message: 'Demo: USYC redemption simulated',
              };
            },

            getAllowlistUrl() {
              return 'https://usyc.dev.hashnote.com/';
            },
          },

          // ==================== BRIDGE (Cross-Chain via CCTP) ====================
          bridge: {
            _privateKey: null as string | null,
            _transfers: new Map<string, any>(),

            setPrivateKey(pk: string) {
              this._privateKey = pk.startsWith('0x') ? pk : `0x${pk}`;
            },

            async transfer(params: { to: string; amount: string; recipient?: string }) {
              if (!this._privateKey && !walletClient) {
                return { success: false, error: 'Private key required. Call setPrivateKey() or set in Settings.' };
              }

              const targetChain = params.to;
              console.log(`[Bridge] Transferring ${params.amount} USDC to ${targetChain}...`);

              // Simulate CCTP bridge flow
              const transferId = `bridge_${Date.now()}`;
              const burnTxHash = `0x${Date.now().toString(16)}burn`;

              this._transfers.set(transferId, {
                id: transferId,
                sourceChain: 'arc-testnet',
                destinationChain: targetChain,
                amount: params.amount,
                status: 'pending',
                burnTxHash,
                createdAt: Date.now(),
              });

              return {
                success: true,
                transferId,
                burnTxHash,
                message: `Demo: Bridge to ${targetChain} initiated. In production, this uses Circle CCTP.`,
              };
            },

            async getStatus(transferId: string) {
              const transfer = this._transfers.get(transferId);
              if (!transfer) {
                return { status: 'not_found' };
              }

              // Simulate progress
              const elapsed = Date.now() - transfer.createdAt;
              if (elapsed > 30000) {
                transfer.status = 'completed';
                transfer.mintTxHash = `0x${Date.now().toString(16)}mint`;
              } else if (elapsed > 15000) {
                transfer.status = 'minting';
              } else if (elapsed > 5000) {
                transfer.status = 'attested';
              } else {
                transfer.status = 'burned';
              }

              return {
                status: transfer.status,
                burnTxHash: transfer.burnTxHash,
                mintTxHash: transfer.mintTxHash,
              };
            },

            getSupportedChains() {
              return [
                { name: 'Arc Testnet', chainId: 5042002, isTestnet: true },
                { name: 'Base Sepolia', chainId: 84532, isTestnet: true },
                { name: 'Sepolia', chainId: 11155111, isTestnet: true },
                { name: 'Arbitrum Sepolia', chainId: 421614, isTestnet: true },
              ];
            },

            isChainSupported(chain: string) {
              const supported = ['arc-testnet', 'base-sepolia', 'sepolia', 'arbitrum-sepolia'];
              return supported.includes(chain.toLowerCase());
            },

            on(event: string, handler: (data: any) => void) {
              // Event subscription for bridge events
              console.log(`[Bridge] Subscribed to: ${event}`);
            },
          },

          // ==================== GATEWAY (Unified Balance) ====================
          gateway: {
            _deposits: new Map<string, string>(),

            async getUnifiedBalance() {
              const address = account?.address;
              if (!address) {
                return { total: '0', available: '0', pending: '0', byChain: {} };
              }

              // Get balance from multiple chains (simulated)
              const arcBalance = await publicClient.getBalance({ address: address as `0x${string}` });
              const arcFormatted = formatUnits(arcBalance, 18);

              return {
                total: arcFormatted,
                available: arcFormatted,
                pending: '0',
                byChain: {
                  'arc-testnet': arcFormatted,
                  'base-sepolia': '0',
                  'sepolia': '0',
                },
              };
            },

            async deposit(params: { amount: string }) {
              requireWallet();
              console.log(`[Gateway] Depositing ${params.amount} USDC...`);

              // In real SDK, this deposits to Gateway Wallet contract
              return {
                success: true,
                txHash: `0x${Date.now().toString(16)}deposit`,
                message: 'Demo: Gateway deposit simulated',
              };
            },

            async withdraw(params: { chain: string; amount: string; recipient?: string }) {
              requireWallet();
              console.log(`[Gateway] Withdrawing ${params.amount} USDC to ${params.chain}...`);

              return {
                success: true,
                initTxHash: `0x${Date.now().toString(16)}withdraw`,
                message: `Demo: Gateway withdrawal to ${params.chain} simulated`,
              };
            },

            getSupportedDomains() {
              return {
                arc: 26,
                arcTestnet: 26,
                ethereum: 0,
                sepolia: 0,
                base: 6,
                baseSepolia: 6,
              };
            },

            async getInfo() {
              return {
                supportedDomains: [0, 6, 26],
                supportedTokens: ['USDC'],
                apiVersion: '1.0',
              };
            },
          },

          // ==================== FX (Stablecoin Swaps) ====================
          fx: {
            _pendingQuotes: new Map<string, any>(),

            async getQuote(params: { from: string; to: string; amount: string }) {
              const { from, to, amount } = params;

              // Mock exchange rates
              const rates: Record<string, number> = {
                'USDC/EURC': 0.92,
                'EURC/USDC': 1.087,
              };

              const pair = `${from}/${to}`;
              const rate = rates[pair];

              if (!rate) {
                throw new Error(`Unsupported pair: ${pair}. Supported: USDC/EURC, EURC/USDC`);
              }

              const toAmount = (parseFloat(amount) * rate).toFixed(2);
              const quoteId = `quote_${Date.now()}`;

              const quote = {
                id: quoteId,
                rate: rate.toString(),
                from: { currency: from, amount },
                to: { currency: to, amount: toAmount },
                expiry: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
                fee: { currency: 'USDC', amount: '0.00' },
              };

              this._pendingQuotes.set(quoteId, quote);
              return quote;
            },

            async swap(params: { quoteId: string }) {
              const quote = this._pendingQuotes.get(params.quoteId);
              if (!quote) {
                return { success: false, error: 'Quote not found or expired' };
              }

              if (new Date(quote.expiry) < new Date()) {
                this._pendingQuotes.delete(params.quoteId);
                return { success: false, error: 'Quote has expired' };
              }

              console.log(`[FX] Swapping ${quote.from.amount} ${quote.from.currency} -> ${quote.to.amount} ${quote.to.currency}`);
              this._pendingQuotes.delete(params.quoteId);

              return {
                success: true,
                received: quote.to.amount,
                message: 'Demo: FX swap simulated. Real swaps require Circle StableFX API key.',
              };
            },

            getSupportedPairs() {
              return ['USDC/EURC', 'EURC/USDC'];
            },

            getCurrencyAddress(currency: string) {
              const addresses: Record<string, string> = {
                USDC: CONTRACTS.usdc,
                EURC: CONTRACTS.eurc,
              };
              return addresses[currency] || '';
            },

            isPairSupported(from: string, to: string) {
              const pair = `${from}/${to}`;
              return ['USDC/EURC', 'EURC/USDC'].includes(pair);
            },

            getMockRate(from: string, to: string) {
              const rates: Record<string, number> = {
                'USDC/EURC': 0.92,
                'EURC/USDC': 1.087,
              };
              return rates[`${from}/${to}`] || 1.0;
            },
          },

          // ==================== AGENT REGISTRY (REAL ON-CHAIN) ====================
          agent: {
            async register(params: { agentAddress?: string; dailyBudget: string; perTxLimit: string }) {
              requireWallet();
              const agentAddr = params.agentAddress || account.address;
              const dailyBudgetWei = parseUnits(params.dailyBudget, 6);
              const perTxLimitWei = parseUnits(params.perTxLimit, 6);

              const hash = await walletClient.writeContract({
                address: CONTRACTS.agent,
                abi: AGENT_ABI,
                functionName: 'registerAgent',
                args: [agentAddr as `0x${string}`, dailyBudgetWei, perTxLimitWei],
              });
              const receipt = await publicClient.waitForTransactionReceipt({ hash });
              return { success: true, txHash: hash, blockNumber: receipt.blockNumber, explorerUrl: `https://testnet.arcscan.app/tx/${hash}` };
            },

            async deposit(params: { agentAddress?: string; amount: string }) {
              requireWallet();
              const agentAddr = params.agentAddress || account.address;
              const amountWei = parseUnits(params.amount, 6);

              // Approve USDC first
              await approveUSDC(CONTRACTS.agent, amountWei);

              const hash = await walletClient.writeContract({
                address: CONTRACTS.agent,
                abi: AGENT_ABI,
                functionName: 'depositFunds',
                args: [agentAddr as `0x${string}`, amountWei],
              });
              const receipt = await publicClient.waitForTransactionReceipt({ hash });
              return { success: true, txHash: hash, blockNumber: receipt.blockNumber };
            },

            async pay(params: { recipient: string; amount: string; memo?: string }) {
              requireWallet();
              const amountWei = parseUnits(params.amount, 6);

              const hash = await walletClient.writeContract({
                address: CONTRACTS.agent,
                abi: AGENT_ABI,
                functionName: 'executePayment',
                args: [params.recipient as `0x${string}`, amountWei, params.memo || ''],
              });
              const receipt = await publicClient.waitForTransactionReceipt({ hash });
              return { success: true, txHash: hash, blockNumber: receipt.blockNumber };
            },

            async getConfig(agentAddress?: string) {
              const addr = (agentAddress || account?.address) as `0x${string}`;
              const data = await publicClient.readContract({
                address: CONTRACTS.agent,
                abi: AGENT_ABI,
                functionName: 'getAgentConfig',
                args: [addr],
              });
              return data;
            },

            async getBalance(agentAddress?: string) {
              const addr = (agentAddress || account?.address) as `0x${string}`;
              const balance = await publicClient.readContract({
                address: CONTRACTS.agent,
                abi: AGENT_ABI,
                functionName: 'getAgentBalance',
                args: [addr],
              });
              return formatUnits(balance as bigint, 6);
            },
          },

          // ==================== PRIVACY (Stealth Addresses - REAL ON-CHAIN) ====================
          privacy: {
            _stealthKeys: null as { spendingPrivateKey: string; spendingPublicKey: string; viewingPrivateKey: string; viewingPublicKey: string } | null,

            // Generate random 32-byte private key
            _generatePrivateKey(): string {
              const array = new Uint8Array(32);
              crypto.getRandomValues(array);
              return '0x' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
            },

            // Simple public key derivation (compressed format mock - real impl needs secp256k1)
            _derivePublicKey(privateKey: string): string {
              // For demo: create a deterministic 33-byte compressed pubkey from private key
              const hash = privateKey.slice(2);
              return '0x02' + hash.slice(0, 64); // 33 bytes compressed format
            },

            generateKeyPair() {
              const spendingPrivateKey = this._generatePrivateKey();
              const viewingPrivateKey = this._generatePrivateKey();
              const spendingPublicKey = this._derivePublicKey(spendingPrivateKey);
              const viewingPublicKey = this._derivePublicKey(viewingPrivateKey);

              this._stealthKeys = { spendingPrivateKey, spendingPublicKey, viewingPrivateKey, viewingPublicKey };

              return {
                spendingPublicKey,
                viewingPublicKey,
                metaAddress: `st:arc:${spendingPublicKey.slice(2)}:${viewingPublicKey.slice(2)}`,
              };
            },

            getStealthKeys() {
              if (!this._stealthKeys) {
                this.generateKeyPair();
              }
              return { ...this._stealthKeys };
            },

            async registerOnChain() {
              requireWallet();
              if (!this._stealthKeys) {
                this.generateKeyPair();
              }

              const hash = await walletClient.writeContract({
                address: CONTRACTS.stealth,
                abi: STEALTH_ABI,
                functionName: 'registerMetaAddress',
                args: [this._stealthKeys!.spendingPublicKey as `0x${string}`, this._stealthKeys!.viewingPublicKey as `0x${string}`],
              });
              await publicClient.waitForTransactionReceipt({ hash });

              return {
                success: true,
                txHash: hash,
                spendingPublicKey: this._stealthKeys!.spendingPublicKey,
                viewingPublicKey: this._stealthKeys!.viewingPublicKey,
                explorerUrl: `https://testnet.arcscan.app/tx/${hash}`,
              };
            },

            async isRegistered(address?: string) {
              const addr = address || account?.address;
              if (!addr) return false;

              return await publicClient.readContract({
                address: CONTRACTS.stealth,
                abi: STEALTH_ABI,
                functionName: 'isRegistered',
                args: [addr as `0x${string}`],
              }) as boolean;
            },

            async getMetaAddress(userAddress: string) {
              const result = await publicClient.readContract({
                address: CONTRACTS.stealth,
                abi: STEALTH_ABI,
                functionName: 'getMetaAddress',
                args: [userAddress as `0x${string}`],
              }) as { spendingPubKey: string; viewingPubKey: string; registeredAt: bigint; active: boolean };

              if (!result.active || result.registeredAt === BigInt(0)) {
                return null;
              }
              return { spendingPublicKey: result.spendingPubKey, viewingPublicKey: result.viewingPubKey };
            },

            // Generate stealth address (simplified for demo)
            _generateStealthAddress(spendingPubKey: string, viewingPubKey: string) {
              const ephemeralPrivKey = this._generatePrivateKey();
              const ephemeralPubKey = this._derivePublicKey(ephemeralPrivKey);
              // Simplified: hash spending + ephemeral to get stealth address
              const combined = spendingPubKey + ephemeralPubKey.slice(2);
              const hashBytes = combined.slice(2, 42);
              const stealthAddress = '0x' + hashBytes;
              return { stealthAddress, ephemeralPublicKey: ephemeralPubKey };
            },

            async sendPrivate(params: { recipient: string; amount: string; memo?: string }) {
              requireWallet();

              // Get recipient's meta-address
              const meta = await this.getMetaAddress(params.recipient);
              if (!meta) {
                throw new Error('Recipient has no registered stealth meta-address');
              }

              // Generate stealth address
              const { stealthAddress, ephemeralPublicKey } = this._generateStealthAddress(meta.spendingPublicKey, meta.viewingPublicKey);
              const amountWei = parseUnits(params.amount, 18);
              const memoBytes = params.memo ? '0x' + Buffer.from(params.memo).toString('hex') : '0x';

              // Send through stealth registry contract
              const hash = await walletClient.writeContract({
                address: CONTRACTS.stealth,
                abi: STEALTH_ABI,
                functionName: 'sendStealthPayment',
                args: [stealthAddress as `0x${string}`, ephemeralPublicKey as `0x${string}`, memoBytes as `0x${string}`],
                value: amountWei,
              });
              const receipt = await publicClient.waitForTransactionReceipt({ hash });

              // Extract announcement ID
              const announcementLog = receipt.logs.find(log => log.address.toLowerCase() === CONTRACTS.stealth.toLowerCase());
              const announcementId = announcementLog?.topics[1] || '';

              return {
                success: true,
                announcementId,
                stealthAddress,
                ephemeralPublicKey,
                txHash: hash,
                explorerUrl: `https://testnet.arcscan.app/tx/${hash}`,
              };
            },

            async scanAnnouncements(fromIndex = 0, count = 100) {
              const total = await publicClient.readContract({
                address: CONTRACTS.stealth,
                abi: STEALTH_ABI,
                functionName: 'getTotalAnnouncements',
                args: [],
              }) as bigint;

              if (total === BigInt(0)) {
                return { payments: [], total: 0 };
              }

              const announcements = await publicClient.readContract({
                address: CONTRACTS.stealth,
                abi: STEALTH_ABI,
                functionName: 'getAnnouncements',
                args: [BigInt(fromIndex), BigInt(count)],
              }) as Array<{ id: string; stealthAddress: string; amount: bigint; ephemeralPubKey: string; encryptedMemo: string; timestamp: bigint; claimed: boolean }>;

              return {
                payments: announcements.map(a => ({
                  id: a.id,
                  stealthAddress: a.stealthAddress,
                  amount: formatUnits(a.amount, 18),
                  ephemeralPublicKey: a.ephemeralPubKey,
                  memo: a.encryptedMemo !== '0x' ? Buffer.from(a.encryptedMemo.slice(2), 'hex').toString() : '',
                  timestamp: Number(a.timestamp),
                  claimed: a.claimed,
                })),
                total: Number(total),
              };
            },
          },

          // ==================== SUBSCRIPTIONS ====================
          subscriptions: {
            _plans: new Map<string, any>(),
            _subscriptions: new Map<string, any>(),

            createPlan(params: { name: string; price: string; period: string; description?: string; features?: string[] }) {
              const plan = {
                id: `plan_${Date.now()}`,
                name: params.name,
                price: params.price,
                period: params.period,
                description: params.description,
                features: params.features || [],
                createdAt: new Date().toISOString(),
              };
              this._plans.set(plan.id, plan);
              return plan;
            },

            getPlan(planId: string) {
              return this._plans.get(planId);
            },

            listPlans() {
              return Array.from(this._plans.values());
            },

            async subscribe(params: { plan: string | any; merchant: string; useStreaming?: boolean }) {
              requireWallet();

              // Resolve plan
              let plan: any;
              if (typeof params.plan === 'string') {
                plan = this._plans.get(params.plan);
                if (!plan) throw new Error(`Plan not found: ${params.plan}`);
              } else {
                plan = this.createPlan(params.plan);
              }

              const now = new Date();
              const subscription = {
                id: `sub_${Date.now()}`,
                planId: plan.id,
                subscriber: account.address,
                merchant: params.merchant,
                status: 'active',
                price: plan.price,
                period: plan.period,
                createdAt: now.toISOString(),
                currentPeriodStart: now.toISOString(),
                currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                nextBillingDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                useStreaming: params.useStreaming || false,
              };

              // Make initial payment
              console.log(`[Subscriptions] Subscribing to ${plan.name} for ${plan.price} USDC/${plan.period}`);

              this._subscriptions.set(subscription.id, subscription);
              return subscription;
            },

            getSubscription(subscriptionId: string) {
              return this._subscriptions.get(subscriptionId);
            },

            listSubscriptions(filter?: { status?: string }) {
              let subs = Array.from(this._subscriptions.values());
              if (filter?.status) {
                subs = subs.filter(s => s.status === filter.status);
              }
              return subs;
            },

            async cancel(subscriptionId: string, options?: { atPeriodEnd?: boolean }) {
              const subscription = this._subscriptions.get(subscriptionId);
              if (!subscription) throw new Error(`Subscription not found: ${subscriptionId}`);

              if (options?.atPeriodEnd) {
                subscription.cancelAtPeriodEnd = true;
              } else {
                subscription.status = 'cancelled';
              }
              subscription.cancelledAt = new Date().toISOString();

              this._subscriptions.set(subscriptionId, subscription);
              return subscription;
            },

            async pause(subscriptionId: string) {
              const subscription = this._subscriptions.get(subscriptionId);
              if (!subscription) throw new Error(`Subscription not found: ${subscriptionId}`);

              subscription.status = 'paused';
              this._subscriptions.set(subscriptionId, subscription);
              return subscription;
            },

            async resume(subscriptionId: string) {
              const subscription = this._subscriptions.get(subscriptionId);
              if (!subscription) throw new Error(`Subscription not found: ${subscriptionId}`);
              if (subscription.status !== 'paused') throw new Error('Subscription is not paused');

              subscription.status = 'active';
              this._subscriptions.set(subscriptionId, subscription);
              return subscription;
            },
          },

          // ==================== INVOICES ====================
          invoices: {
            _invoices: new Map<string, any>(),

            create(params: { to: string; amount: string; dueDate?: string; items?: any[]; metadata?: any }) {
              const invoice = {
                id: `inv_${Date.now()}`,
                number: `INV-${Date.now().toString().slice(-8)}`,
                from: account?.address || 'Unknown',
                to: params.to,
                amount: params.amount,
                status: 'pending',
                items: params.items || [{ description: 'Services', amount: params.amount }],
                dueDate: params.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                createdAt: new Date().toISOString(),
                metadata: params.metadata,
              };

              this._invoices.set(invoice.id, invoice);
              return invoice;
            },

            get(invoiceId: string) {
              return this._invoices.get(invoiceId);
            },

            list(filter?: { status?: string }) {
              let invoices = Array.from(this._invoices.values());
              if (filter?.status) {
                invoices = invoices.filter(i => i.status === filter.status);
              }
              return invoices;
            },

            async pay(invoiceId: string) {
              requireWallet();
              const invoice = this._invoices.get(invoiceId);
              if (!invoice) throw new Error(`Invoice not found: ${invoiceId}`);
              if (invoice.status === 'paid') throw new Error('Invoice already paid');

              // Make payment
              const amountWei = parseUnits(invoice.amount, 18);
              const hash = await walletClient.sendTransaction({
                to: invoice.from as `0x${string}`,
                value: amountWei,
              });
              await publicClient.waitForTransactionReceipt({ hash });

              // Update invoice
              invoice.status = 'paid';
              invoice.paidAt = new Date().toISOString();
              invoice.txHash = hash;
              this._invoices.set(invoiceId, invoice);

              return {
                success: true,
                invoice,
                txHash: hash,
                explorerUrl: `https://testnet.arcscan.app/tx/${hash}`,
              };
            },

            async send(invoiceId: string, method?: string) {
              const invoice = this._invoices.get(invoiceId);
              if (!invoice) throw new Error(`Invoice not found: ${invoiceId}`);

              invoice.sentAt = new Date().toISOString();
              invoice.sentVia = method || 'email';
              this._invoices.set(invoiceId, invoice);

              return {
                success: true,
                message: `Invoice ${invoice.number} sent via ${method || 'email'}`,
              };
            },

            async cancel(invoiceId: string) {
              const invoice = this._invoices.get(invoiceId);
              if (!invoice) throw new Error(`Invoice not found: ${invoiceId}`);
              if (invoice.status === 'paid') throw new Error('Cannot cancel paid invoice');

              invoice.status = 'cancelled';
              invoice.cancelledAt = new Date().toISOString();
              this._invoices.set(invoiceId, invoice);

              return invoice;
            },
          },

          // ==================== UTILITIES ====================
          utils: {
            validateAddress(address: string): string {
              if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
                throw new Error('Invalid Ethereum address');
              }
              return address.toLowerCase() as `0x${string}`;
            },

            async retry<T>(fn: () => Promise<T>, options?: { maxAttempts?: number; baseDelay?: number }): Promise<T> {
              const maxAttempts = options?.maxAttempts || 3;
              const baseDelay = options?.baseDelay || 1000;
              let lastError: any;

              for (let i = 0; i < maxAttempts; i++) {
                try {
                  return await fn();
                } catch (e) {
                  lastError = e;
                  if (i < maxAttempts - 1) {
                    await new Promise(r => setTimeout(r, baseDelay * Math.pow(2, i)));
                  }
                }
              }
              throw lastError;
            },

            async batchExecute<T, R>(items: T[], fn: (item: T) => Promise<R>, options?: { batchSize?: number; delayMs?: number }): Promise<{ item: T; success: boolean; result?: R; error?: string }[]> {
              const batchSize = options?.batchSize || 10;
              const delayMs = options?.delayMs || 100;
              const results: { item: T; success: boolean; result?: R; error?: string }[] = [];

              for (let i = 0; i < items.length; i += batchSize) {
                const batch = items.slice(i, i + batchSize);
                const batchResults = await Promise.all(
                  batch.map(async (item) => {
                    try {
                      const result = await fn(item);
                      return { item, success: true, result };
                    } catch (e: any) {
                      return { item, success: false, error: e.message };
                    }
                  })
                );
                results.push(...batchResults);
                if (i + batchSize < items.length) {
                  await new Promise(r => setTimeout(r, delayMs));
                }
              }
              return results;
            },

            shortenAddress(address: string, chars = 4): string {
              return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
            },

            formatUSDC(amount: string | bigint, decimals = 6): string {
              if (typeof amount === 'bigint') {
                return formatUnits(amount, decimals);
              }
              return amount;
            },
          },

          // ==================== LOGGING ====================
          logger: {
            _logs: [] as { level: string; message: string; data?: any; timestamp: Date }[],
            _level: 'info' as 'debug' | 'info' | 'warn' | 'error',

            setLevel(level: 'debug' | 'info' | 'warn' | 'error') {
              this._level = level;
            },

            debug(message: string, data?: any) {
              if (this._level === 'debug') {
                console.log('[DEBUG]', message, data || '');
                this._logs.push({ level: 'debug', message, data, timestamp: new Date() });
              }
            },

            info(message: string, data?: any) {
              console.log('[INFO]', message, data || '');
              this._logs.push({ level: 'info', message, data, timestamp: new Date() });
            },

            warn(message: string, data?: any) {
              console.log('[WARN]', message, data || '');
              this._logs.push({ level: 'warn', message, data, timestamp: new Date() });
            },

            error(message: string, data?: any) {
              console.log('[ERROR]', message, data || '');
              this._logs.push({ level: 'error', message, data, timestamp: new Date() });
            },

            getLogs() {
              return this._logs;
            },

            clear() {
              this._logs = [];
            },
          },

          // ==================== EVENTS ====================
          events: {
            _listeners: new Map<string, Function[]>(),

            on(event: string, handler: Function) {
              if (!this._listeners.has(event)) {
                this._listeners.set(event, []);
              }
              this._listeners.get(event)!.push(handler);
              return () => this.off(event, handler);
            },

            off(event: string, handler: Function) {
              const handlers = this._listeners.get(event);
              if (handlers) {
                const idx = handlers.indexOf(handler);
                if (idx > -1) handlers.splice(idx, 1);
              }
            },

            emit(event: string, data?: any) {
              const handlers = this._listeners.get(event);
              if (handlers) {
                handlers.forEach(h => h({ type: event, data, timestamp: new Date() }));
              }
            },

            once(event: string, handler: Function) {
              const wrapper = (data: any) => {
                handler(data);
                this.off(event, wrapper);
              };
              this.on(event, wrapper);
            },
          },

          // ==================== SMART WALLET ====================
          smartWallet: {
            _config: null as any,
            _guardians: [] as string[],
            _dailyLimit: '1000',
            _spentToday: 0,

            async deploy(params?: { guardians?: string[]; threshold?: number; dailyLimit?: string }) {
              requireWallet();
              console.log('[SmartWallet] Deploying smart wallet...');

              this._guardians = params?.guardians || [];
              this._dailyLimit = params?.dailyLimit || '1000';

              const config = {
                address: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
                owner: account.address,
                guardians: this._guardians,
                threshold: params?.threshold || 1,
                dailyLimit: this._dailyLimit,
                deployedAt: new Date().toISOString(),
              };

              this._config = config;

              return {
                success: true,
                address: config.address,
                txHash: `0x${Date.now().toString(16)}deploy`,
                message: 'Demo: Smart wallet deployment simulated',
              };
            },

            getAddress() {
              return this._config?.address || null;
            },

            async addGuardian(guardian: string) {
              requireWallet();
              if (!this._config) throw new Error('Smart wallet not deployed');

              this._guardians.push(guardian);
              this._config.guardians = this._guardians;

              return { success: true, guardians: this._guardians };
            },

            async removeGuardian(guardian: string) {
              requireWallet();
              if (!this._config) throw new Error('Smart wallet not deployed');

              const idx = this._guardians.indexOf(guardian);
              if (idx > -1) this._guardians.splice(idx, 1);
              this._config.guardians = this._guardians;

              return { success: true, guardians: this._guardians };
            },

            getGuardians() {
              return [...this._guardians];
            },

            async setDailyLimit(limit: string) {
              requireWallet();
              if (!this._config) throw new Error('Smart wallet not deployed');

              this._dailyLimit = limit;
              this._config.dailyLimit = limit;

              return { success: true, dailyLimit: limit };
            },

            getDailyLimit() {
              return { limit: this._dailyLimit, spent: this._spentToday.toString() };
            },

            async execute(params: { to: string; value?: string; data?: string }) {
              requireWallet();
              if (!this._config) throw new Error('Smart wallet not deployed');

              const value = parseFloat(params.value || '0');
              if (this._spentToday + value > parseFloat(this._dailyLimit)) {
                throw new Error('Daily limit exceeded');
              }

              this._spentToday += value;

              return {
                success: true,
                txHash: `0x${Date.now().toString(16)}execute`,
                message: 'Demo: Smart wallet execution simulated',
              };
            },

            async initiateRecovery(newOwner: string) {
              if (this._guardians.length === 0) {
                throw new Error('No guardians configured');
              }

              return {
                success: true,
                recoveryId: `recovery_${Date.now()}`,
                requiredApprovals: Math.ceil(this._guardians.length / 2),
                message: 'Demo: Recovery initiated',
              };
            },
          },

          // ==================== AI MODULE ====================
          ai: {
            _geminiKey: null as string | null,

            setApiKey(key: string) {
              this._geminiKey = key;
            },

            async parseCommand(text: string) {
              console.log(`[AI] Parsing command: "${text}"`);

              // Simple command parsing without API
              const patterns = {
                send: /send\s+(\d+\.?\d*)\s*(usdc|eurc)?\s+to\s+(\S+)/i,
                balance: /balance|bakiye/i,
                swap: /swap\s+(\d+\.?\d*)\s+(\w+)\s+to\s+(\w+)/i,
              };

              for (const [action, pattern] of Object.entries(patterns)) {
                const match = text.match(pattern);
                if (match) {
                  if (action === 'send') {
                    return {
                      action: 'transfer',
                      amount: match[1],
                      currency: match[2] || 'USDC',
                      recipient: match[3],
                      confidence: 0.9,
                    };
                  }
                  if (action === 'balance') {
                    return { action: 'getBalance', confidence: 0.95 };
                  }
                  if (action === 'swap') {
                    return {
                      action: 'swap',
                      amount: match[1],
                      from: match[2],
                      to: match[3],
                      confidence: 0.85,
                    };
                  }
                }
              }

              return { action: 'unknown', originalText: text, confidence: 0.1 };
            },

            async explainTransaction(tx: { hash?: string; from?: string; to?: string; value?: string; data?: string }) {
              console.log('[AI] Explaining transaction...');

              const value = tx.value ? formatUnits(BigInt(tx.value), 18) : '0';
              const isTransfer = tx.data === '0x' || !tx.data || tx.data.startsWith('0xa9059cbb');

              return {
                summary: isTransfer
                  ? `Transfer of ${value} USDC from ${tx.from?.slice(0, 10)}... to ${tx.to?.slice(0, 10)}...`
                  : `Contract interaction with ${tx.to?.slice(0, 10)}...`,
                type: isTransfer ? 'transfer' : 'contract_call',
                risk: 'low',
                details: {
                  from: tx.from,
                  to: tx.to,
                  value,
                },
              };
            },

            async analyzeSpending(transactions: any[]) {
              console.log(`[AI] Analyzing ${transactions.length} transactions...`);

              const total = transactions.reduce((sum, tx) => sum + parseFloat(tx.amount || '0'), 0);
              const byCategory: Record<string, number> = {};

              transactions.forEach(tx => {
                const cat = tx.category || 'other';
                byCategory[cat] = (byCategory[cat] || 0) + parseFloat(tx.amount || '0');
              });

              return {
                totalSpent: total.toFixed(2),
                transactionCount: transactions.length,
                byCategory,
                recommendations: [
                  'Consider setting up recurring payments for regular expenses',
                  'Use payment streams for salary payments',
                ],
              };
            },

            async chat(message: string) {
              console.log(`[AI] Chat: "${message}"`);

              // Simple responses without API
              const lowerMsg = message.toLowerCase();

              if (lowerMsg.includes('help') || lowerMsg.includes('yardım')) {
                return {
                  response: 'I can help you with: sending payments, checking balance, creating escrows, and setting up payment streams. What would you like to do?',
                };
              }

              if (lowerMsg.includes('balance') || lowerMsg.includes('bakiye')) {
                return {
                  response: 'To check your balance, use: arc.getBalance(). For EURC balance: arc.getEURCBalance()',
                  suggestedAction: 'getBalance',
                };
              }

              return {
                response: `I understood: "${message}". Try commands like "send 10 USDC to 0x..." or ask for "help".`,
              };
            },
          },

          // ==================== VOICE MODULE ====================
          voice: {
            _recognition: null as any,
            _isListening: false,

            isSupported() {
              return typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window);
            },

            async startListening(onResult: (text: string) => void, onError?: (error: any) => void) {
              if (!this.isSupported()) {
                throw new Error('Speech recognition not supported in this browser');
              }

              const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
              this._recognition = new SpeechRecognition();
              this._recognition.continuous = false;
              this._recognition.interimResults = false;
              this._recognition.lang = 'en-US';

              this._recognition.onresult = (event: any) => {
                const text = event.results[0][0].transcript;
                onResult(text);
              };

              this._recognition.onerror = (event: any) => {
                if (onError) onError(event.error);
              };

              this._recognition.onend = () => {
                this._isListening = false;
              };

              this._recognition.start();
              this._isListening = true;

              return { listening: true };
            },

            stopListening() {
              if (this._recognition) {
                this._recognition.stop();
                this._isListening = false;
              }
              return { listening: false };
            },

            isListening() {
              return this._isListening;
            },

            async speak(text: string, options?: { lang?: string; rate?: number }) {
              if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
                console.log('[Voice] Speech synthesis not available');
                return { spoken: false };
              }

              const utterance = new SpeechSynthesisUtterance(text);
              utterance.lang = options?.lang || 'en-US';
              utterance.rate = options?.rate || 1;

              window.speechSynthesis.speak(utterance);

              return { spoken: true, text };
            },

            async listenAndExecute() {
              return new Promise((resolve, reject) => {
                this.startListening(
                  async (text) => {
                    console.log(`[Voice] Heard: "${text}"`);
                    // Parse and execute command
                    // @ts-ignore
                    const parsed = await this.ai?.parseCommand(text);
                    resolve({ text, parsed });
                  },
                  (error) => reject(error)
                );
              });
            },
          },

          // ==================== COMPLIANCE ====================
          compliance: {
            _blocklist: new Set<string>(),
            _rules: {
              maxTransactionAmount: '10000',
              requireKYC: false,
              allowedCountries: ['*'],
            },

            setRules(rules: { maxTransactionAmount?: string; requireKYC?: boolean; allowedCountries?: string[] }) {
              this._rules = { ...this._rules, ...rules };
              return this._rules;
            },

            getRules() {
              return { ...this._rules };
            },

            addToBlocklist(address: string) {
              this._blocklist.add(address.toLowerCase());
              return { success: true, blocklistSize: this._blocklist.size };
            },

            removeFromBlocklist(address: string) {
              this._blocklist.delete(address.toLowerCase());
              return { success: true, blocklistSize: this._blocklist.size };
            },

            isBlocked(address: string) {
              return this._blocklist.has(address.toLowerCase());
            },

            async checkTransaction(params: { from: string; to: string; amount: string }) {
              const issues: string[] = [];

              if (this.isBlocked(params.from)) {
                issues.push('Sender is on blocklist');
              }
              if (this.isBlocked(params.to)) {
                issues.push('Recipient is on blocklist');
              }
              if (parseFloat(params.amount) > parseFloat(this._rules.maxTransactionAmount)) {
                issues.push(`Amount exceeds maximum (${this._rules.maxTransactionAmount})`);
              }

              return {
                approved: issues.length === 0,
                issues,
                checkedAt: new Date().toISOString(),
              };
            },

            async screenAddress(address: string) {
              // Simulated sanctions screening
              return {
                address,
                isBlocked: this.isBlocked(address),
                riskLevel: 'low',
                screenedAt: new Date().toISOString(),
              };
            },
          },

          // ==================== GAS STATION ====================
          gasStation: {
            _balance: '0',

            async deposit(amount: string) {
              requireWallet();
              console.log(`[GasStation] Depositing ${amount} for gas sponsorship...`);

              this._balance = (parseFloat(this._balance) + parseFloat(amount)).toString();

              return {
                success: true,
                newBalance: this._balance,
                message: 'Demo: Gas station deposit simulated',
              };
            },

            getBalance() {
              return this._balance;
            },

            async sponsorGas(userTx: { from: string; to: string; data?: string }) {
              const gasEstimate = '0.001';

              if (parseFloat(this._balance) < parseFloat(gasEstimate)) {
                return { success: false, error: 'Insufficient gas station balance' };
              }

              this._balance = (parseFloat(this._balance) - parseFloat(gasEstimate)).toString();

              return {
                success: true,
                sponsoredAmount: gasEstimate,
                remainingBalance: this._balance,
              };
            },

            async withdraw(amount: string) {
              requireWallet();

              if (parseFloat(amount) > parseFloat(this._balance)) {
                throw new Error('Insufficient balance');
              }

              this._balance = (parseFloat(this._balance) - parseFloat(amount)).toString();

              return {
                success: true,
                withdrawn: amount,
                remainingBalance: this._balance,
              };
            },
          },

          // ==================== CONTRACTS INFO ====================
          getContractAddresses(chainId?: number) {
            // Arc Testnet addresses
            return {
              usdc: CONTRACTS.usdc,
              eurc: CONTRACTS.eurc,
              usyc: CONTRACTS.usyc,
              escrow: CONTRACTS.escrow,
              streamPayment: CONTRACTS.stream,
              paymentChannel: CONTRACTS.channel,
              stealthRegistry: CONTRACTS.stealth,
              agentRegistry: CONTRACTS.agent,
              chainId: chainId || 5042002,
            };
          },

          areContractsDeployed(chainId?: number) {
            // Check if it's Arc Testnet
            return (chainId || 5042002) === 5042002;
          },

          // ==================== CIRCUIT BREAKER ====================
          createCircuitBreaker(options?: { failureThreshold?: number; resetTimeout?: number }) {
            const failureThreshold = options?.failureThreshold || 5;
            const resetTimeout = options?.resetTimeout || 30000;
            let failures = 0;
            let state: 'closed' | 'open' | 'half-open' = 'closed';
            let lastFailure = 0;

            return {
              get state() { return state; },
              get failures() { return failures; },

              async execute<T>(fn: () => Promise<T>): Promise<T> {
                if (state === 'open') {
                  if (Date.now() - lastFailure > resetTimeout) {
                    state = 'half-open';
                  } else {
                    throw new Error('Circuit breaker is OPEN');
                  }
                }

                try {
                  const result = await fn();
                  if (state === 'half-open') {
                    state = 'closed';
                    failures = 0;
                  }
                  return result;
                } catch (e) {
                  failures++;
                  lastFailure = Date.now();
                  if (failures >= failureThreshold) {
                    state = 'open';
                  }
                  throw e;
                }
              },

              reset() {
                failures = 0;
                state = 'closed';
                lastFailure = 0;
              },
            };
          },

          // ==================== RATE LIMITER ====================
          createRateLimiter(options?: { maxRequests?: number; windowMs?: number }) {
            const maxRequests = options?.maxRequests || 100;
            const windowMs = options?.windowMs || 60000;
            const requests = new Map<string, number[]>();

            return {
              check(key: string): { allowed: boolean; remaining: number; retryAfter?: number } {
                const now = Date.now();
                const timestamps = requests.get(key) || [];
                const validTimestamps = timestamps.filter(t => now - t < windowMs);

                if (validTimestamps.length >= maxRequests) {
                  const oldestValid = Math.min(...validTimestamps);
                  return {
                    allowed: false,
                    remaining: 0,
                    retryAfter: windowMs - (now - oldestValid),
                  };
                }

                validTimestamps.push(now);
                requests.set(key, validTimestamps);

                return {
                  allowed: true,
                  remaining: maxRequests - validTimestamps.length,
                };
              },

              reset(key: string) {
                requests.delete(key);
              },
            };
          },

          // ==================== WEBHOOKS (Demo) ====================
          webhooks: {
            _endpoints: [] as { id: string; url: string; events: string[]; secret: string }[],

            register(config: { url: string; events: string[] }) {
              const endpoint = {
                id: `wh_${Date.now()}`,
                url: config.url,
                events: config.events,
                secret: `whsec_${Math.random().toString(36).slice(2)}`,
              };
              this._endpoints.push(endpoint);
              return {
                id: endpoint.id,
                secret: endpoint.secret,
                message: 'Webhook registered (demo mode - no actual HTTP calls)',
              };
            },

            list() {
              return this._endpoints;
            },

            remove(id: string) {
              const idx = this._endpoints.findIndex(e => e.id === id);
              if (idx > -1) {
                this._endpoints.splice(idx, 1);
                return true;
              }
              return false;
            },

            verifySignature(payload: any, signature: string, secret: string): boolean {
              // Demo verification
              return signature.startsWith('sha256=') && secret.startsWith('whsec_');
            },

            simulateEvent(eventType: string, data: any) {
              const matchingEndpoints = this._endpoints.filter(e => e.events.includes(eventType));
              return {
                eventType,
                data,
                sentTo: matchingEndpoints.map(e => e.url),
                message: `Would send to ${matchingEndpoints.length} endpoint(s)`,
              };
            },
          },
        };
      };

      // ArcPay class mock
      const ArcPay = {
        async init(config: any) {
          return createArcPayMock(config);
        }
      };

      // Simple API mocks
      const configure = (config: any) => { /* stored globally */ };
      const pay = async (to: string, amount: string) => {
        const arc = await ArcPay.init({ privateKey: privateKey || undefined });
        return arc.sendUSDC(to, amount);
      };
      const balance = async () => {
        const arc = await ArcPay.init({ privateKey: privateKey || undefined });
        const usdc = await arc.getBalance();
        return { usdc, address: arc.address };
      };

      // Create a function that runs the code
      const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;

      // Mock process.env for browser
      const process = {
        env: {
          PRIVATE_KEY: privateKey || undefined,
          GEMINI_API_KEY: geminiApiKey || undefined,
        }
      };

      // Wrap code to use our custom console and ArcPay
      const wrappedCode = `
        const { createPublicClient, createWalletClient, http, formatUnits, parseUnits, defineChain } = viem;
        const console = customConsole;
        ${code}
      `;

      const fn = new AsyncFunction('viem', 'customConsole', 'ArcPay', 'configure', 'pay', 'balance', 'process', wrappedCode);
      await fn(viem, customConsole, ArcPay, configure, pay, balance, process);

      logs.push('✅ Execution completed');
      setCodeOutput([...logs]);
    } catch (error: any) {
      logs.push(`❌ Error: ${error.message}`);
      setCodeOutput([...logs]);
    } finally {
      setIsRunning(false);
    }
  };

  // ==================== CONSOLE MODE ====================
  const executeConsoleCommand = async (cmd: string) => {
    const command = cmd.trim().toLowerCase();
    addConsoleLog('user', `> ${cmd}`);

    if (command === 'help') {
      addConsoleLog('info', 'Available commands:');
      addConsoleLog('info', '  balance [address] - Check USDC balance');
      addConsoleLog('info', '  block - Get current block number');
      addConsoleLog('info', '  pay <address> <amount> - Send USDC');
      addConsoleLog('info', '  clear - Clear console');
      addConsoleLog('info', '  config - Show current config');
      return;
    }

    if (command === 'clear') {
      setConsoleLogs([{ type: 'system', text: 'Console cleared', timestamp: new Date() }]);
      return;
    }

    if (command === 'config') {
      addConsoleLog('info', `Chain ID: ${DEMO_CONFIG.chainId}`);
      addConsoleLog('info', `RPC: ${DEMO_CONFIG.rpcUrl}`);
      addConsoleLog('info', `USDC: ${DEMO_CONFIG.usdcAddress}`);
      addConsoleLog('info', `Gemini Key: ${geminiApiKey ? '✓ Set' : '✗ Not set'}`);
      return;
    }

    if (command === 'block') {
      try {
        addConsoleLog('info', 'Fetching block number...');
        const { createPublicClient, http } = await import('viem');
        const client = createPublicClient({
          transport: http(DEMO_CONFIG.rpcUrl),
        });
        const blockNumber = await client.getBlockNumber();
        addConsoleLog('success', `Current block: ${blockNumber}`);
      } catch (error: any) {
        addConsoleLog('error', `Error: ${error.message}`);
      }
      return;
    }

    if (command.startsWith('balance')) {
      const parts = command.split(' ');
      const address = parts[1] || '0xF505e2E71df58D7244189072008f25f6b6aaE5ae';

      try {
        addConsoleLog('info', `Checking balance for ${address.slice(0, 10)}...`);
        const { createPublicClient, http, formatUnits } = await import('viem');
        const client = createPublicClient({
          transport: http(DEMO_CONFIG.rpcUrl),
        });

        const balance = await client.readContract({
          address: DEMO_CONFIG.usdcAddress as `0x${string}`,
          abi: [{
            name: 'balanceOf',
            type: 'function',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
          }],
          functionName: 'balanceOf',
          args: [address as `0x${string}`],
        });

        const formatted = formatUnits(balance as bigint, 6);
        setDemoBalance(formatted);
        addConsoleLog('success', `Balance: ${formatted} USDC`);
      } catch (error: any) {
        addConsoleLog('error', `Error: ${error.message}`);
      }
      return;
    }

    if (command.startsWith('pay ')) {
      const parts = command.split(' ');
      if (parts.length < 3) {
        addConsoleLog('error', 'Usage: pay <address> <amount>');
        return;
      }
      const [, to, amount] = parts;
      addConsoleLog('info', `Sending ${amount} USDC to ${to.slice(0, 10)}...`);

      const result = await sendPayment(to, amount);
      if (result.success) {
        const simText = result.simulated ? ' (simulated)' : '';
        addConsoleLog('success', `✅ Sent ${amount} USDC to ${to}${simText}`);
        addConsoleLog('info', `Tx: ${result.txHash}`);
      } else {
        addConsoleLog('error', `❌ Failed: ${result.error}`);
      }
      return;
    }

    // Try to interpret as natural language using Gemini
    if (geminiApiKey) {
      addConsoleLog('ai', '🤖 Interpreting with Gemini...');
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        const result = await model.generateContent(
          `You are a blockchain payment assistant. The user typed: "${cmd}".
          Provide a brief, helpful response about what they might want to do with payments, balances, or blockchain operations.
          Keep it under 100 words.`
        );

        addConsoleLog('ai', result.response.text());
      } catch (error: any) {
        addConsoleLog('error', `Unknown command. Type "help" for available commands.`);
      }
    } else {
      addConsoleLog('error', 'Unknown command. Type "help" for available commands.');
    }
  };

  const handleConsoleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (consoleInput.trim()) {
      executeConsoleCommand(consoleInput);
      setConsoleInput('');
    }
  };

  // Auto-scroll console
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consoleLogs]);

  return (
    <div className="min-h-screen py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Interactive Playground</h1>
            <p className="text-gray-400">Real voice, vision, and code execution on Arc Testnet</p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center gap-2"
          >
            ⚙️ Settings
          </button>
        </div>

        {/* Settings Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 bg-gray-900 rounded-xl p-6 border border-gray-800"
            >
              <h3 className="text-lg font-semibold mb-4">API Settings</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Gemini API Key</label>
                  <input
                    type="password"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    placeholder="AIza..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Get from <a href="https://aistudio.google.com" target="_blank" className="text-cyan-400">aistudio.google.com</a>
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Demo Private Key (Testnet only)</label>
                  <input
                    type="password"
                    value={privateKey}
                    onChange={(e) => setPrivateKey(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">⚠️ Only use testnet keys!</p>
                </div>
              </div>
              <button
                onClick={saveSettings}
                className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg"
              >
                Save Settings
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mode Tabs - Simplified to 4 */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {[
            { id: 'ai-demo', icon: '🎤', label: 'AI Demo' },
            { id: 'code', icon: '💻', label: 'Code' },
            { id: 'payments', icon: '💳', label: 'Payments' },
            { id: 'streaming', icon: '📅', label: 'Streaming' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMode(tab.id as DemoMode)}
              className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                mode === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {/* AI DEMO MODE - Voice + Image combined */}
          {mode === 'ai-demo' && (
            <motion.div
              key="ai-demo"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800">
                <h2 className="text-2xl font-bold text-center mb-4">🤖 AI Demo</h2>
                <p className="text-center text-gray-400 mb-6">
                  Voice commands and image analysis powered by Gemini
                </p>

                {/* AI Sub-mode Toggle */}
                <div className="flex justify-center gap-2 mb-8">
                  <button
                    onClick={() => setAISubMode('voice')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                      aiSubMode === 'voice'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <span>🎤</span> Voice Command
                  </button>
                  <button
                    onClick={() => setAISubMode('image')}
                    className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                      aiSubMode === 'image'
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    <span>📸</span> Image Analysis
                  </button>
                </div>

                {/* Voice Sub-mode */}
                {aiSubMode === 'voice' && (
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Voice Area - 2 columns */}
                    <div className="md:col-span-2">
                      <div className="flex flex-col items-center mb-8">
                        <button
                          onClick={isListening ? stopListening : startListening}
                          className={`w-24 h-24 rounded-full flex items-center justify-center mb-4 transition-all ${
                            isListening
                              ? 'bg-red-500 animate-pulse'
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/>
                            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                          </svg>
                        </button>
                        <p className="text-gray-400">
                          {isListening ? 'Listening... Click to stop' : 'Click to start'}
                        </p>
                        {transcript && (
                          <p className="mt-4 text-lg text-cyan-400">"{transcript}"</p>
                        )}
                      </div>

                      {/* Voice Logs */}
                      <div className="bg-gray-800/50 rounded-xl p-6 min-h-[200px] max-h-[400px] overflow-y-auto">
                        <h3 className="text-sm text-gray-500 mb-4">Activity Log</h3>
                        <div className="space-y-2">
                          {voiceLogs.map((log, i) => (
                            <div
                              key={i}
                              className={`text-sm ${
                                log.type === 'success' ? 'text-emerald-400' :
                                log.type === 'error' ? 'text-red-400' :
                                log.type === 'user' ? 'text-white' :
                                log.type === 'ai' ? 'text-cyan-400' :
                                log.type === 'info' ? 'text-cyan-400' : 'text-gray-400'
                              }`}
                            >
                              {log.text}
                            </div>
                          ))}
                          {voiceLogs.length === 0 && (
                            <p className="text-gray-600">Click the microphone to start...</p>
                          )}
                        </div>
                      </div>

                      <div className="mt-6 text-center text-sm text-gray-500">
                        Try: "Send 50 dollars to Ahmed" or "Pay Netflix 15 USDC"
                      </div>
                    </div>

                    {/* Contacts Sidebar - 1 column */}
                    <div className="bg-gray-800/30 rounded-xl p-4 h-fit">
                      <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                        <span>Contacts</span>
                        <span className="text-xs bg-gray-700 px-2 py-0.5 rounded-full">{contacts.length}</span>
                      </h3>
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {contacts.map((contact) => (
                          <div
                            key={contact.name}
                            onClick={() => copyAddress(contact.address)}
                            className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-700/50 cursor-pointer transition-colors group"
                            title={`Click to copy: ${contact.address}`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${categoryColors[contact.category] || 'bg-gray-600'}`}>
                              {contact.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-white truncate">{contact.displayName}</p>
                              <p className="text-xs text-gray-500 font-mono truncate">{contact.address.slice(0, 10)}...</p>
                            </div>
                            <span className="text-gray-600 group-hover:text-gray-400 text-xs">copy</span>
                          </div>
                        ))}
                        {contacts.length === 0 && (
                          <p className="text-gray-600 text-sm text-center py-4">No contacts yet</p>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setMode('payments');
                          setPaymentSubMode('contacts');
                        }}
                        className="mt-3 w-full py-2 text-sm text-cyan-400 hover:text-cyan-300 border border-gray-700 hover:border-cyan-500/50 rounded-lg transition-colors"
                      >
                        + Manage Contacts
                      </button>
                    </div>
                  </div>
                )}

                {/* Image Sub-mode */}
                {aiSubMode === 'image' && (
                  <div className="grid md:grid-cols-2 gap-8">
                  {/* Upload */}
                  <div>
                    <h3 className="font-semibold mb-4">Upload Invoice or Receipt</h3>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center cursor-pointer hover:border-cyan-500 transition-colors min-h-[250px] flex flex-col items-center justify-center"
                    >
                      {uploadedImage ? (
                        <img src={uploadedImage} alt="Uploaded" className="max-h-48 rounded-lg" />
                      ) : (
                        <>
                          <div className="text-5xl mb-4">📄</div>
                          <p className="text-gray-400">Drop image or click to upload</p>
                        </>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    {uploadedImage && (
                      <button
                        onClick={analyzeImage}
                        disabled={isAnalyzing || !geminiApiKey}
                        className="mt-4 w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-medium"
                      >
                        {isAnalyzing ? 'Analyzing with Gemini...' : '🔍 Analyze Image'}
                      </button>
                    )}
                  </div>

                  {/* Results */}
                  <div>
                    <h3 className="font-semibold mb-4">Analysis Result</h3>
                    <div className="bg-gray-800/50 rounded-xl p-6 min-h-[300px]">
                      {isAnalyzing && (
                        <div className="flex flex-col items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500 mb-4"></div>
                          <p className="text-gray-400">Analyzing with Gemini Vision...</p>
                        </div>
                      )}

                      {analysisResult && !analysisResult.paid && (
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-emerald-400">
                            <span>✅</span>
                            <span>{analysisResult.type} detected!</span>
                          </div>
                          <div className="space-y-2 text-sm">
                            {analysisResult.amount && (
                              <p className="flex justify-between">
                                <span className="text-gray-400">Amount:</span>
                                <span className="font-semibold">${analysisResult.amount}</span>
                              </p>
                            )}
                            {analysisResult.recipientName && (
                              <p className="flex justify-between">
                                <span className="text-gray-400">Vendor:</span>
                                <span>{analysisResult.recipientName}</span>
                              </p>
                            )}
                            {analysisResult.recipient && (
                              <p className="flex justify-between">
                                <span className="text-gray-400">Address:</span>
                                <span className="font-mono text-xs">{analysisResult.recipient}</span>
                              </p>
                            )}
                            {analysisResult.invoiceNumber && (
                              <p className="flex justify-between">
                                <span className="text-gray-400">Invoice #:</span>
                                <span>{analysisResult.invoiceNumber}</span>
                              </p>
                            )}
                            {analysisResult.confidence && (
                              <p className="flex justify-between">
                                <span className="text-gray-400">Confidence:</span>
                                <span className="text-cyan-400">{analysisResult.confidence}%</span>
                              </p>
                            )}
                          </div>
                          {analysisResult.amount && (
                            <button
                              onClick={payInvoice}
                              disabled={isPayingInvoice}
                              className="w-full mt-4 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg font-medium"
                            >
                              {isPayingInvoice ? '⏳ Processing...' : `💳 Pay $${analysisResult.amount} USDC`}
                            </button>
                          )}
                        </div>
                      )}

                      {analysisResult?.paid && (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <div className="text-5xl mb-4">✅</div>
                          <p className="text-xl font-semibold text-emerald-400">Payment Sent!</p>
                          <p className="text-gray-400 mt-2">${analysisResult.amount} USDC</p>
                          {paymentTxHash && (
                            <p className="text-xs text-gray-500 mt-2 font-mono">
                              TX: {paymentTxHash.slice(0, 20)}...
                            </p>
                          )}
                        </div>
                      )}

                      {!isAnalyzing && !analysisResult && (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <p className="text-gray-500">Upload and analyze an image</p>
                        </div>
                      )}
                    </div>
                  </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* CODE MODE */}
          {mode === 'code' && (
            <motion.div
              key="code"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="flex gap-4">
                {/* API Explorer Sidebar */}
                <div className="hidden lg:block w-72 flex-shrink-0">
                  <div className="sticky top-4 h-[700px]">
                    <APIExplorer
                      selectedAPI={selectedAPI}
                      onSelectAPI={(api, category) => {
                        setSelectedAPI(api);
                        setSelectedCategory(category);
                        setCode(api.code);
                        setCodeOutput([]);
                      }}
                    />
                  </div>
                </div>

                {/* Main Editor Area */}
                <div className="flex-1 min-w-0">
                  <div className="bg-gray-900/50 rounded-2xl p-6 border border-gray-800">
                    {/* Header with API info */}
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        {selectedAPI ? (
                          <div>
                            <h2 className="text-xl font-bold flex items-center gap-2">
                              <span>{selectedCategory?.icon}</span>
                              <span>{selectedAPI.name}()</span>
                            </h2>
                            <p className="text-sm text-gray-400">{selectedAPI.description}</p>
                          </div>
                        ) : (
                          <h2 className="text-xl font-bold">⌨️ Code Editor</h2>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(code);
                            setCodeCopied(true);
                            setTimeout(() => setCodeCopied(false), 2000);
                          }}
                          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm flex items-center gap-2"
                        >
                          {codeCopied ? '✓ Copied!' : '📋 Copy'}
                        </button>
                        <button
                          onClick={runCode}
                          disabled={isRunning}
                          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg font-medium flex items-center gap-2"
                        >
                          {isRunning ? '⏳ Running...' : '▶️ Run Code'}
                        </button>
                      </div>
                    </div>

                    {/* Mobile API Selector */}
                    <div className="lg:hidden mb-4">
                      <select
                        value={selectedAPI ? `${selectedCategory?.name}:${selectedAPI.name}` : ''}
                        onChange={(e) => {
                          const [catName, apiName] = e.target.value.split(':');
                          const cat = API_CATEGORIES.find(c => c.name === catName);
                          const api = cat?.apis.find(a => a.name === apiName);
                          if (cat && api) {
                            setSelectedCategory(cat);
                            setSelectedAPI(api);
                            setCode(api.code);
                            setCodeOutput([]);
                          }
                        }}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm"
                      >
                        <option value="">Select an API ({TOTAL_API_COUNT} available)</option>
                        {API_CATEGORIES.map(cat => (
                          <optgroup key={cat.name} label={`${cat.icon} ${cat.name}`}>
                            {cat.apis.map(api => (
                              <option key={api.name} value={`${cat.name}:${api.name}`}>
                                {api.name}()
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>

                    <div className="grid xl:grid-cols-2 gap-4">
                      {/* Editor */}
                      <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
                        <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center">
                          <div className="flex space-x-2">
                            <div className="w-3 h-3 rounded-full bg-red-500"></div>
                            <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          </div>
                          <span className="ml-4 text-sm text-gray-400">
                            {selectedAPI ? `${selectedAPI.name}.ts` : 'playground.ts'}
                          </span>
                          {selectedAPI?.params && (
                            <span className="ml-auto text-xs text-gray-500">
                              params: {selectedAPI.params.join(', ')}
                            </span>
                          )}
                        </div>
                        <MonacoEditor
                          height="500px"
                          language="typescript"
                          theme="vs-dark"
                          value={code}
                          onChange={(value) => setCode(value || '')}
                          options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            lineNumbers: 'on',
                            scrollBeyondLastLine: false,
                            automaticLayout: true,
                          }}
                        />
                      </div>

                      {/* Output */}
                      <div className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800">
                        <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
                          <span className="text-sm text-gray-400">📤 Output</span>
                          {codeOutput.length > 0 && (
                            <button
                              onClick={() => setCodeOutput([])}
                              className="text-xs text-gray-500 hover:text-white"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                        <div className="p-4 h-[500px] overflow-y-auto font-mono text-sm">
                          {codeOutput.length > 0 ? (
                            codeOutput.map((line, i) => (
                              <div
                                key={i}
                                className={`mb-1 ${
                                  line.startsWith('❌') ? 'text-red-400' :
                                  line.startsWith('✅') ? 'text-emerald-400' : 'text-gray-300'
                                }`}
                              >
                                {line}
                              </div>
                            ))
                          ) : (
                            <div className="text-gray-500">
                              <p>Click "Run Code" to execute...</p>
                              {selectedAPI && (
                                <p className="mt-4 text-xs">
                                  Tip: This example for <span className="text-cyan-400">{selectedAPI.name}()</span> is ready to run.
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* API Stats */}
                    <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                      <span>
                        {API_CATEGORIES.length} modules • {TOTAL_API_COUNT} APIs available
                      </span>
                      <span>
                        Arc Testnet • Chain ID: {DEMO_CONFIG.chainId}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* PAYMENTS MODE - Contains Contacts, Templates, Split, Links, Requests */}
          {mode === 'payments' && (
            <motion.div
              key="payments"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800">
                <h2 className="text-2xl font-bold text-center mb-4">💳 Payments</h2>
                <p className="text-center text-gray-400 mb-6">Manage contacts, templates, splits, links, and requests</p>

                {/* Payment Sub-mode Toggle */}
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                  {[
                    { id: 'contacts', icon: '👥', label: 'Contacts' },
                    { id: 'templates', icon: '📋', label: 'Templates' },
                    { id: 'split', icon: '➗', label: 'Split' },
                    { id: 'links', icon: '🔗', label: 'Links' },
                    { id: 'requests', icon: '📨', label: 'Requests' },
                  ].map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => setPaymentSubMode(sub.id as PaymentSubMode)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                        paymentSubMode === sub.id
                          ? 'bg-cyan-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      <span>{sub.icon}</span> {sub.label}
                    </button>
                  ))}
                </div>

                {/* Contacts Sub-mode */}
                {paymentSubMode === 'contacts' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold">👥 Contacts</h3>
                  <button
                    onClick={() => setIsAddingContact(!isAddingContact)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      isAddingContact
                        ? 'bg-gray-700 text-gray-300'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isAddingContact ? 'Cancel' : '+ Add Contact'}
                  </button>
                </div>

                {/* Add Contact Form */}
                <AnimatePresence>
                  {isAddingContact && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-6 bg-gray-800/50 rounded-xl p-6"
                    >
                      <h3 className="text-lg font-semibold mb-4">Add New Contact</h3>
                      <div className="grid gap-4">
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Name</label>
                          <input
                            type="text"
                            value={newContactName}
                            onChange={(e) => setNewContactName(e.target.value)}
                            placeholder="e.g., Ahmed, Netflix, Coffee Shop"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Address</label>
                          <input
                            type="text"
                            value={newContactAddress}
                            onChange={(e) => setNewContactAddress(e.target.value)}
                            placeholder="0x..."
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Category</label>
                          <select
                            value={newContactCategory}
                            onChange={(e) => setNewContactCategory(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                          >
                            <option value="personal">Personal</option>
                            <option value="business">Business</option>
                            <option value="subscription">Subscription</option>
                            <option value="merchant">Merchant</option>
                            <option value="agent">Agent</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <button
                          onClick={addContact}
                          className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-all"
                        >
                          Save Contact
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Search */}
                <div className="mb-6">
                  <input
                    type="text"
                    value={contactSearchQuery}
                    onChange={(e) => setContactSearchQuery(e.target.value)}
                    placeholder="Search contacts..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
                  />
                </div>

                {/* Contacts List */}
                <div className="space-y-3">
                  {filteredContacts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      {contacts.length === 0 ? (
                        <>
                          <p className="text-lg mb-2">No contacts yet</p>
                          <p className="text-sm">Add your first contact to get started</p>
                        </>
                      ) : (
                        <p>No contacts match your search</p>
                      )}
                    </div>
                  ) : (
                    filteredContacts.map((contact) => (
                      <motion.div
                        key={contact.name}
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="bg-gray-800/50 rounded-xl p-4 flex items-center justify-between group hover:bg-gray-800/70 transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xl font-bold">
                            {contact.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white">{contact.displayName}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[contact.category] || categoryColors.other}`}>
                                {contact.category}
                              </span>
                            </div>
                            <div className="text-sm text-gray-400 font-mono">
                              {contact.address.slice(0, 10)}...{contact.address.slice(-8)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => copyAddress(contact.address)}
                            className="p-2 hover:bg-gray-700 rounded-lg transition-all"
                            title="Copy address"
                          >
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => deleteContact(contact.name)}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-all"
                            title="Delete contact"
                          >
                            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                {/* Usage Examples */}
                <div className="mt-8 bg-gray-800/30 rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4">💡 SDK Examples</h3>
                  <div className="space-y-3 text-sm text-gray-400">
                    <p>Use the Contacts module in the SDK:</p>
                    <pre className="bg-gray-900 rounded-lg p-3 mt-2 font-mono text-xs overflow-x-auto">
{`import { ArcPay } from 'arcpay';

const arc = await ArcPay.init({ network: 'arc-testnet', privateKey });

// Add a contact
const contact = await arc.contacts.add('ahmed', '0x742d35...', {
  category: 'personal',
  notes: 'My friend Ahmed'
});

// Search contacts
const results = await arc.contacts.search('ahm');

// Resolve name to address
const address = await arc.contacts.resolve('ahmed');

// Pay by name (auto-resolves contact)
await arc.transfer({ to: 'ahmed', amount: '50.00' });

// List all contacts
const all = await arc.contacts.list();

// Delete a contact
await arc.contacts.delete('ahmed');`}
                    </pre>
                    <p className="mt-4">Voice commands:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>"Send $50 to Ahmed"</li>
                      <li>"Pay Netflix $15"</li>
                      <li>"List my contacts"</li>
                    </ul>
                  </div>
                </div>
                  </div>
                )}

                {/* Templates Sub-mode - will be rendered here */}
                {paymentSubMode === 'templates' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold">📋 Payment Templates</h3>
                        <p className="text-gray-400 text-sm mt-1">
                          Pre-configured templates for popular services
                        </p>
                      </div>
                    </div>

                    {/* Templates Grid */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {[
                        { id: 'netflix', name: 'Netflix', amount: '15.99', icon: '🎬', category: 'Subscription' },
                        { id: 'spotify', name: 'Spotify', amount: '9.99', icon: '🎵', category: 'Subscription' },
                        { id: 'youtube', name: 'YouTube Premium', amount: '13.99', icon: '📺', category: 'Subscription' },
                        { id: 'github', name: 'GitHub Pro', amount: '4.00', icon: '🐙', category: 'Subscription' },
                        { id: 'chatgpt', name: 'ChatGPT Plus', amount: '20.00', icon: '🤖', category: 'Subscription' },
                        { id: 'salary', name: 'Monthly Salary', amount: '-', icon: '💼', category: 'Business' },
                      ].map((template) => (
                        <div
                          key={template.id}
                          className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 hover:border-cyan-500 transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-2xl">
                              {template.icon}
                            </div>
                            <div>
                              <p className="font-semibold">{template.name}</p>
                              <p className="text-sm text-gray-400">{template.category}</p>
                            </div>
                          </div>
                          {template.amount !== '-' && (
                            <p className="text-cyan-400 font-bold">${template.amount} USDC</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Split Sub-mode */}
                {paymentSubMode === 'split' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold">➗ Split Payment</h3>
                        <p className="text-gray-400 text-sm mt-1">
                          Divide payments between multiple recipients
                        </p>
                      </div>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-6 mb-6">
                      <h4 className="text-lg font-semibold mb-4">Create Split Payment</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Total Amount (USDC)</label>
                          <input
                            type="text"
                            placeholder="100.00"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Recipients</label>
                          <div className="space-y-2">
                            <input placeholder="alice - 25%" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white" />
                            <input placeholder="bob - 25%" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white" />
                            <input placeholder="charlie - 50%" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white" />
                          </div>
                        </div>
                        <button className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium">
                          Split Payment
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Links Sub-mode */}
                {paymentSubMode === 'links' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold">🔗 Payment Links</h3>
                        <p className="text-gray-400 text-sm mt-1">
                          Create shareable payment links
                        </p>
                      </div>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-6 mb-6">
                      <h4 className="text-lg font-semibold mb-4">Create Payment Link</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Amount (USDC)</label>
                          <input
                            type="text"
                            placeholder="50.00"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Description</label>
                          <input
                            type="text"
                            placeholder="Dinner split"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                          />
                        </div>
                        <button className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium">
                          Create Link
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Requests Sub-mode */}
                {paymentSubMode === 'requests' && (
                  <div>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h3 className="text-xl font-bold">📨 Payment Requests</h3>
                        <p className="text-gray-400 text-sm mt-1">
                          Request payments from others
                        </p>
                      </div>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-6 mb-6">
                      <h4 className="text-lg font-semibold mb-4">Create Payment Request</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">From (Address or Name)</label>
                          <input
                            type="text"
                            placeholder="ahmed or 0x..."
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Amount (USDC)</label>
                          <input
                            type="text"
                            placeholder="25.00"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Note</label>
                          <input
                            type="text"
                            placeholder="For lunch yesterday"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                          />
                        </div>
                        <button className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium">
                          Send Request
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* STREAMING MODE (formerly Subscriptions) */}
          {mode === 'streaming' && (
            <motion.div
              key="streaming"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-gray-900/50 rounded-2xl p-8 border border-gray-800">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold">📅 Streaming Payments</h2>
                    <p className="text-gray-400 text-sm mt-1">
                      Monthly total: <span className="text-emerald-400 font-semibold">${getMonthlyTotal()}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {getDueBills().length > 0 && (
                      <button
                        onClick={payAllDue}
                        className="px-4 py-2 rounded-lg font-medium bg-amber-600 hover:bg-amber-700 text-white transition-all"
                      >
                        Pay All Due ({getDueBills().length})
                      </button>
                    )}
                    <button
                      onClick={() => setIsAddingSub(!isAddingSub)}
                      className={`px-4 py-2 rounded-lg font-medium transition-all ${
                        isAddingSub
                          ? 'bg-gray-700 text-gray-300'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      {isAddingSub ? 'Cancel' : '+ Add Subscription'}
                    </button>
                  </div>
                </div>

                {/* Add Subscription Form */}
                <AnimatePresence>
                  {isAddingSub && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-6 bg-gray-800/50 rounded-xl p-6"
                    >
                      <h3 className="text-lg font-semibold mb-4">Add New Subscription</h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Name</label>
                          <input
                            type="text"
                            value={newSubName}
                            onChange={(e) => setNewSubName(e.target.value)}
                            placeholder="e.g., Netflix, Spotify, GitHub"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Address</label>
                          <input
                            type="text"
                            value={newSubAddress}
                            onChange={(e) => setNewSubAddress(e.target.value)}
                            placeholder="0x..."
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Monthly Amount (USDC)</label>
                          <input
                            type="text"
                            value={newSubAmount}
                            onChange={(e) => setNewSubAmount(e.target.value)}
                            placeholder="15.99"
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">Billing Day (1-31)</label>
                          <input
                            type="number"
                            min="1"
                            max="31"
                            value={newSubBillingDay}
                            onChange={(e) => setNewSubBillingDay(e.target.value)}
                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white"
                          />
                        </div>
                      </div>
                      <button
                        onClick={addSubscription}
                        className="mt-4 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg font-medium transition-all"
                      >
                        Save Subscription
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Status Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {subscriptions.filter(s => getSubscriptionStatus(s) === 'overdue').length}
                    </div>
                    <div className="text-sm text-red-400/70">Overdue</div>
                  </div>
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-amber-400">
                      {subscriptions.filter(s => getSubscriptionStatus(s) === 'due').length}
                    </div>
                    <div className="text-sm text-amber-400/70">Due Today</div>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-blue-400">
                      {subscriptions.filter(s => getSubscriptionStatus(s) === 'upcoming').length}
                    </div>
                    <div className="text-sm text-blue-400/70">Upcoming</div>
                  </div>
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
                    <div className="text-2xl font-bold text-emerald-400">
                      {subscriptions.filter(s => getSubscriptionStatus(s) === 'paid').length}
                    </div>
                    <div className="text-sm text-emerald-400/70">Paid</div>
                  </div>
                </div>

                {/* Subscriptions List */}
                <div className="space-y-3">
                  {subscriptions.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <p className="text-lg mb-2">No subscriptions yet</p>
                      <p className="text-sm">Add your first subscription to track recurring payments</p>
                    </div>
                  ) : (
                    subscriptions.map((sub) => {
                      const status = getSubscriptionStatus(sub);
                      const dueDate = new Date(sub.nextDueDate);
                      const isPaying = isPayingBill === sub.name;

                      return (
                        <motion.div
                          key={sub.name}
                          layout
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className={`rounded-xl p-4 flex items-center justify-between group hover:bg-gray-800/70 transition-all border ${getStatusColor(status)}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-xl font-bold">
                              {sub.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white">{sub.displayName}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(status)}`}>
                                  {getStatusIcon(status)} {status}
                                </span>
                              </div>
                              <div className="text-sm text-gray-400">
                                ${sub.amount}/month • Due: {dueDate.toLocaleDateString()}
                              </div>
                              <div className="text-xs text-gray-500 font-mono mt-1">
                                {sub.address.slice(0, 10)}...{sub.address.slice(-8)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {(status === 'due' || status === 'overdue') && (
                              <button
                                onClick={() => paySubscription(sub)}
                                disabled={isPaying}
                                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                  isPaying
                                    ? 'bg-gray-700 text-gray-400'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                              >
                                {isPaying ? 'Paying...' : `Pay $${sub.amount}`}
                              </button>
                            )}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => snoozeSubscription(sub.name, 3)}
                                className="p-2 hover:bg-gray-700 rounded-lg transition-all text-gray-400 hover:text-white"
                                title="Snooze 3 days"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => deleteSubscription(sub.name)}
                                className="p-2 hover:bg-red-500/20 rounded-lg transition-all"
                                title="Delete subscription"
                              >
                                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>

                {/* Usage Examples */}
                <div className="mt-8 bg-gray-800/30 rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4">💡 SDK Examples</h3>
                  <div className="space-y-3 text-sm text-gray-400">
                    <p>Use the Contacts module with subscription category:</p>
                    <pre className="bg-gray-900 rounded-lg p-3 mt-2 font-mono text-xs overflow-x-auto">
{`import { ArcPay } from 'arcpay';

const arc = await ArcPay.init({ network: 'arc-testnet', privateKey });

// Add a subscription (contact with category: 'subscription')
await arc.contacts.add('netflix', '0x742d35...', {
  category: 'subscription',
  monthlyAmount: '15.99',
  billingDay: 15  // Due on 15th of each month
});

// Get all subscriptions
const subs = await arc.contacts.getSubscriptions();

// Get bills due today
const dueBills = await arc.contacts.getDueSubscriptions();

// Get upcoming bills (next 7 days)
const upcoming = await arc.contacts.getUpcomingSubscriptions(7);

// Pay a subscription
const netflix = await arc.contacts.get('netflix');
const result = await arc.sendUSDC(netflix.address, netflix.metadata.monthlyAmount);
await arc.contacts.markPaid('netflix', result.txHash);

// Get monthly total
const total = await arc.contacts.getMonthlyTotal();`}
                    </pre>
                    <p className="mt-4">Voice commands:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>"What bills are due?"</li>
                      <li>"Pay my Netflix"</li>
                      <li>"Pay all my bills"</li>
                      <li>"How much do I spend on subscriptions?"</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Info */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Connected to Arc Testnet (Chain ID: 5042002)</p>
          {!geminiApiKey && (
            <p className="text-yellow-400 mt-2">⚠️ Set Gemini API key in settings for AI features</p>
          )}
        </div>
      </div>
    </div>
  );
}
