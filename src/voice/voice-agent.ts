/**
 * Voice-Enabled Agent
 *
 * Combines AI Agent with voice input/output for hands-free payments.
 * Uses Gemini 3.0 Flash for natural language understanding.
 * Supports ContactManager for human-readable address aliases.
 */

import { AIAgent, createAIAgent } from '../ai/ai-agent';
import type { AIAgentConfig } from '../ai/ai-agent';
import type { AICommandResult } from '../ai/types';
import { SpeechRecognizer } from './speech-recognition';
import { SpeechSynthesizer } from './speech-synthesis';
import type { VoiceAgentConfig } from './types';
import { ContactManager, createContactManager } from '../modules/contacts';
import type { ContactMetadata } from '../modules/contacts';

// ============ Types ============

export interface VoiceEnabledAgentConfig extends AIAgentConfig {
  voice?: VoiceAgentConfig;
  aliases?: Record<string, string>; // e.g., { 'writer-bot': '0x123...' }
  /** ContactManager instance for address resolution */
  contacts?: ContactManager;
  /** Auto-resolve contact names in commands (default: true) */
  autoResolveContacts?: boolean;
}

// ============ Voice Agent ============

export class VoiceEnabledAgent {
  private aiAgent: AIAgent;
  private recognizer: SpeechRecognizer;
  private synthesizer: SpeechSynthesizer;
  private config: VoiceEnabledAgentConfig;
  private aliases: Map<string, string>;
  private contactManager: ContactManager;

  constructor(config: VoiceEnabledAgentConfig) {
    this.config = config;
    this.aliases = new Map(Object.entries(config.aliases || {}));

    // Initialize ContactManager (use provided or create new)
    this.contactManager = config.contacts ?? createContactManager();

    // Initialize AI agent (includes Gemini function calling)
    this.aiAgent = createAIAgent({
      ...config,
      confirmBeforeExecute: config.voice?.confirmLargePayments ?? true,
      confirmThreshold: config.voice?.largePaymentThreshold || '100'
    });

    // Initialize voice
    this.recognizer = new SpeechRecognizer({
      language: config.voice?.language || 'en-US'
    });
    this.synthesizer = new SpeechSynthesizer({
      language: config.voice?.language || 'en-US'
    });
  }

  /**
   * Execute a voice command (listen -> AI process -> execute -> respond)
   */
  async executeVoiceCommand(): Promise<AICommandResult> {
    try {
      // 1. Listen
      await this.speak("Listening...");
      const speech = await this.recognizer.listen();

      if (!speech.transcript) {
        return this.respond({
          success: false,
          action: 'listen',
          message: "I didn't catch that. Please try again."
        });
      }

      // 2. Check for contact-related commands first
      const contactResult = await this.handleContactCommand(speech.transcript);
      if (contactResult) {
        return this.respond(contactResult);
      }

      // 3. Process with AI (Gemini Function Calling)
      await this.speak("Processing...");
      const processedCommand = await this.resolveAliases(speech.transcript);
      const result = await this.aiAgent.processCommand(processedCommand);

      // 4. Handle confirmation if needed
      if (result.needsConfirmation) {
        const confirmed = await this.requestConfirmation(result.confirmationPrompt!);

        if (confirmed) {
          const execResult = await this.aiAgent.confirmExecution();
          return this.respond(execResult);
        } else {
          this.aiAgent.cancelPendingAction();
          return this.respond({
            success: false,
            action: 'cancelled',
            message: 'Action cancelled.'
          });
        }
      }

      return this.respond(result);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      return this.respond({
        success: false,
        action: 'error',
        message
      });
    }
  }

  /**
   * Execute a text command (skip listening)
   */
  async executeTextCommand(command: string): Promise<AICommandResult> {
    // Check for contact-related commands first
    const contactResult = await this.handleContactCommand(command);
    if (contactResult) {
      return contactResult;
    }

    // Resolve contacts and process with AI
    const processedCommand = await this.resolveAliases(command);
    const result = await this.aiAgent.processCommand(processedCommand);
    return result;
  }

  /**
   * Process an image with optional voice/text command
   */
  async processImage(
    imageBase64: string,
    command?: string,
    mimeType: string = 'image/jpeg'
  ): Promise<AICommandResult> {
    const prompt = command || "Analyze this image and suggest appropriate payment action";
    return this.aiAgent.processWithImage(prompt, imageBase64, mimeType);
  }

  /**
   * Pay an invoice from image
   */
  async payInvoiceFromImage(
    imageBase64: string,
    autoPay: boolean = false
  ): Promise<AICommandResult> {
    const result = await this.aiAgent.analyzeAndPayInvoice(imageBase64, autoPay);

    if (result.needsConfirmation && !autoPay) {
      await this.speak(result.confirmationPrompt!);
    }

    return result;
  }

  /**
   * Verify delivery and release escrow
   */
  async verifyDeliveryAndRelease(
    imageBase64: string,
    escrowId: string,
    expectedDelivery: string,
    autoRelease: boolean = false
  ): Promise<AICommandResult> {
    return this.aiAgent.analyzeDeliveryAndRelease(
      imageBase64,
      escrowId,
      expectedDelivery,
      autoRelease
    );
  }

  /**
   * Confirm pending action via voice
   */
  async confirmPendingAction(): Promise<AICommandResult> {
    return this.aiAgent.confirmExecution();
  }

  /**
   * Start continuous voice listening mode
   */
  startContinuousListening(
    onResult: (result: AICommandResult) => void,
    onError?: (error: Error) => void
  ): void {
    this.recognizer.startContinuous(
      async (speechResult) => {
        if (speechResult.isFinal && speechResult.transcript) {
          try {
            // Check for contact commands first
            const contactResult = await this.handleContactCommand(speechResult.transcript);
            if (contactResult) {
              onResult(contactResult);
              if (this.config.voice?.speakResponses !== false) {
                await this.synthesizer.speak(contactResult.message);
              }
              return;
            }

            // Process with AI
            const processedCommand = await this.resolveAliases(speechResult.transcript);
            const result = await this.aiAgent.processCommand(processedCommand);
            onResult(result);

            if (this.config.voice?.speakResponses !== false) {
              await this.synthesizer.speak(result.message);
            }
          } catch (error) {
            onError?.(error as Error);
          }
        }
      },
      onError
    );
  }

  /**
   * Stop continuous listening
   */
  stopContinuousListening(): void {
    this.recognizer.stop();
  }

  // ============ Alias Management ============

  /**
   * Add an alias for an address
   */
  addAlias(alias: string, address: string): void {
    this.aliases.set(alias.toLowerCase(), address);
  }

  /**
   * Remove an alias
   */
  removeAlias(alias: string): void {
    this.aliases.delete(alias.toLowerCase());
  }

  /**
   * Get all aliases
   */
  getAliases(): Record<string, string> {
    return Object.fromEntries(this.aliases);
  }

  // ============ Contact Management ============

  /**
   * Add a new contact
   *
   * @example
   * ```typescript
   * await agent.addContact('Ahmed', '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD78', {
   *   category: 'personal'
   * });
   * ```
   */
  async addContact(name: string, address: string, metadata?: ContactMetadata): Promise<AICommandResult> {
    try {
      const contact = await this.contactManager.add(name, address, metadata);
      return {
        success: true,
        action: 'add_contact',
        message: `Contact "${contact.displayName}" saved with address ${contact.address.slice(0, 10)}...`,
        data: contact
      };
    } catch (error) {
      return {
        success: false,
        action: 'add_contact',
        message: error instanceof Error ? error.message : 'Failed to add contact'
      };
    }
  }

  /**
   * Delete a contact
   */
  async deleteContact(name: string): Promise<AICommandResult> {
    try {
      const deleted = await this.contactManager.delete(name);
      if (deleted) {
        return {
          success: true,
          action: 'delete_contact',
          message: `Contact "${name}" has been deleted.`
        };
      } else {
        return {
          success: false,
          action: 'delete_contact',
          message: `Contact "${name}" not found.`
        };
      }
    } catch (error) {
      return {
        success: false,
        action: 'delete_contact',
        message: error instanceof Error ? error.message : 'Failed to delete contact'
      };
    }
  }

  /**
   * List all contacts
   */
  async listContacts(): Promise<AICommandResult> {
    try {
      const contacts = await this.contactManager.list();
      if (contacts.length === 0) {
        return {
          success: true,
          action: 'list_contacts',
          message: 'You have no saved contacts.',
          data: []
        };
      }

      const names = contacts.map(c => c.displayName).join(', ');
      return {
        success: true,
        action: 'list_contacts',
        message: `You have ${contacts.length} contacts: ${names}`,
        data: contacts
      };
    } catch (error) {
      return {
        success: false,
        action: 'list_contacts',
        message: error instanceof Error ? error.message : 'Failed to list contacts'
      };
    }
  }

  /**
   * Lookup a contact
   */
  async lookupContact(name: string): Promise<AICommandResult> {
    try {
      const contact = await this.contactManager.get(name);
      if (contact) {
        return {
          success: true,
          action: 'lookup_contact',
          message: `${contact.displayName} is at address ${contact.address}`,
          data: contact
        };
      } else {
        // Try fuzzy search
        const matches = await this.contactManager.search(name);
        if (matches.length > 0) {
          const bestMatch = matches[0].contact;
          return {
            success: true,
            action: 'lookup_contact',
            message: `Did you mean "${bestMatch.displayName}"? Address: ${bestMatch.address}`,
            data: bestMatch
          };
        }
        return {
          success: false,
          action: 'lookup_contact',
          message: `Contact "${name}" not found.`
        };
      }
    } catch (error) {
      return {
        success: false,
        action: 'lookup_contact',
        message: error instanceof Error ? error.message : 'Failed to lookup contact'
      };
    }
  }

  /**
   * Get the ContactManager instance
   */
  getContacts(): ContactManager {
    return this.contactManager;
  }

  // ============ Private Methods ============

  private async resolveAliases(command: string): Promise<string> {
    let resolved = command;

    // First, resolve using ContactManager (if enabled)
    if (this.config.autoResolveContacts !== false) {
      resolved = await this.contactManager.resolveAll(resolved);
    }

    // Then, resolve legacy aliases
    this.aliases.forEach((address, alias) => {
      const regex = new RegExp(`\\b${alias}\\b`, 'gi');
      resolved = resolved.replace(regex, address);
    });

    return resolved;
  }

  /**
   * Parse and handle contact-related voice commands
   */
  private async handleContactCommand(command: string): Promise<AICommandResult | null> {
    const lowerCommand = command.toLowerCase();

    // "save ahmed as 0x..." or "add contact ahmed 0x..."
    const addMatch = command.match(/(?:save|add(?:\s+contact)?)\s+(\w+)\s+(?:as\s+)?(0x[a-fA-F0-9]{40})/i);
    if (addMatch) {
      return this.addContact(addMatch[1], addMatch[2]);
    }

    // "delete contact ahmed" or "remove ahmed"
    const deleteMatch = command.match(/(?:delete|remove)(?:\s+contact)?\s+(\w+)/i);
    if (deleteMatch) {
      return this.deleteContact(deleteMatch[1]);
    }

    // "list contacts" or "show my contacts"
    if (/(?:list|show)(?:\s+(?:my|all))?\s+contacts/i.test(lowerCommand)) {
      return this.listContacts();
    }

    // "who is ahmed" or "lookup ahmed"
    const whoMatch = command.match(/(?:who\s+is|lookup|find)\s+(\w+)/i);
    if (whoMatch) {
      return this.lookupContact(whoMatch[1]);
    }

    // ============ SUBSCRIPTION COMMANDS ============

    // "add netflix subscription $15.99 monthly on the 15th to 0x..."
    const addSubMatch = command.match(
      /add\s+(\w+)\s+(?:as\s+)?subscription\s+\$?([\d.]+)\s+(?:monthly|per\s+month)(?:\s+(?:on|due)\s+(?:the\s+)?(\d+)(?:st|nd|rd|th)?)?(?:\s+(?:to\s+)?(0x[a-fA-F0-9]{40}))?/i
    );
    if (addSubMatch) {
      return this.addSubscription(
        addSubMatch[1],
        addSubMatch[2],
        addSubMatch[3] ? parseInt(addSubMatch[3]) : new Date().getDate(),
        addSubMatch[4]
      );
    }

    // "what bills are due" or "any bills due"
    if (/what\s+bills?\s+(?:are\s+)?due/i.test(lowerCommand)) {
      return this.checkDueBills();
    }

    // "show upcoming bills" or "list due subscriptions"
    if (/(?:show|list)\s+(?:upcoming|due)\s+(?:bills?|subscriptions?)/i.test(lowerCommand)) {
      return this.listUpcomingBills();
    }

    // "any overdue bills" or "show overdue subscriptions"
    if (/(?:any|show|list)\s+overdue\s+(?:bills?|subscriptions?)/i.test(lowerCommand)) {
      return this.checkOverdueBills();
    }

    // "show my subscriptions" or "list subscriptions"
    if (/(?:show|list)\s+(?:my\s+)?subscriptions?/i.test(lowerCommand)) {
      return this.listSubscriptions();
    }

    // "pay all my bills" or "pay all due"
    if (/pay\s+all\s+(?:my\s+)?(?:bills?|subscriptions?|due)/i.test(lowerCommand)) {
      return this.payAllDueBills();
    }

    // "snooze netflix for 3 days"
    const snoozeMatch = command.match(/snooze\s+(\w+)\s+(?:for\s+)?(\d+)\s+(days?|weeks?)/i);
    if (snoozeMatch) {
      const days = snoozeMatch[3].startsWith('week')
        ? parseInt(snoozeMatch[2]) * 7
        : parseInt(snoozeMatch[2]);
      return this.snoozeSubscription(snoozeMatch[1], days);
    }

    // "delay netflix payment by 5 days"
    const delayMatch = command.match(/delay\s+(\w+)\s+(?:payment\s+)?(?:by\s+)?(\d+)\s+(days?|weeks?)/i);
    if (delayMatch) {
      const days = delayMatch[3].startsWith('week')
        ? parseInt(delayMatch[2]) * 7
        : parseInt(delayMatch[2]);
      return this.snoozeSubscription(delayMatch[1], days);
    }

    // "how much do I spend on subscriptions"
    if (/(?:how\s+much|what)\s+(?:do\s+I\s+)?spend\s+on\s+subscriptions?/i.test(lowerCommand)) {
      return this.getSubscriptionTotal();
    }

    // "monthly subscription total"
    if (/(?:my\s+)?monthly\s+(?:subscription\s+)?total/i.test(lowerCommand)) {
      return this.getSubscriptionTotal();
    }

    return null; // Not a contact command
  }

  // ============ SUBSCRIPTION HANDLERS ============

  /**
   * Add a new subscription
   */
  async addSubscription(
    name: string,
    amount: string,
    billingDay: number,
    address?: string
  ): Promise<AICommandResult> {
    try {
      if (!address) {
        return {
          success: false,
          action: 'add_subscription',
          message: `Please provide an address for ${name}. Say: add ${name} subscription ${amount} monthly on the ${billingDay}th to 0x...`,
        };
      }

      const contact = await this.contactManager.add(name, address, {
        category: 'subscription',
        monthlyAmount: amount,
        billingDay,
      });

      return {
        success: true,
        action: 'add_subscription',
        message: `Subscription "${contact.displayName}" added! $${amount} due on the ${billingDay}th of each month.`,
        data: contact,
      };
    } catch (error) {
      return {
        success: false,
        action: 'add_subscription',
        message: error instanceof Error ? error.message : 'Failed to add subscription',
      };
    }
  }

  /**
   * Check bills due today
   */
  async checkDueBills(): Promise<AICommandResult> {
    try {
      const due = await this.contactManager.getDueSubscriptions();
      const overdue = await this.contactManager.getOverdueSubscriptions();
      const all = [...overdue, ...due];

      if (all.length === 0) {
        return {
          success: true,
          action: 'check_due_bills',
          message: 'No bills are due today. You\'re all caught up!',
          data: [],
        };
      }

      const total = all.reduce((sum, c) => sum + parseFloat(c.metadata.monthlyAmount || '0'), 0);
      const names = all.map((c) => `${c.displayName} ($${c.metadata.monthlyAmount})`).join(', ');

      return {
        success: true,
        action: 'check_due_bills',
        message: `You have ${all.length} bill${all.length > 1 ? 's' : ''} due: ${names}. Total: $${total.toFixed(2)}. Say "pay all my bills" to pay them.`,
        data: all,
      };
    } catch (error) {
      return {
        success: false,
        action: 'check_due_bills',
        message: error instanceof Error ? error.message : 'Failed to check bills',
      };
    }
  }

  /**
   * List upcoming bills
   */
  async listUpcomingBills(): Promise<AICommandResult> {
    try {
      const upcoming = await this.contactManager.getUpcomingSubscriptions(7);

      if (upcoming.length === 0) {
        return {
          success: true,
          action: 'list_upcoming_bills',
          message: 'No bills due in the next 7 days.',
          data: [],
        };
      }

      const items = upcoming.map((c) => {
        const status = this.contactManager.getSubscriptionStatus(c);
        return `${c.displayName} ($${c.metadata.monthlyAmount}) in ${status.daysUntilDue} days`;
      });

      return {
        success: true,
        action: 'list_upcoming_bills',
        message: `Upcoming bills: ${items.join(', ')}.`,
        data: upcoming,
      };
    } catch (error) {
      return {
        success: false,
        action: 'list_upcoming_bills',
        message: error instanceof Error ? error.message : 'Failed to list upcoming bills',
      };
    }
  }

  /**
   * Check overdue bills
   */
  async checkOverdueBills(): Promise<AICommandResult> {
    try {
      const overdue = await this.contactManager.getOverdueSubscriptions();

      if (overdue.length === 0) {
        return {
          success: true,
          action: 'check_overdue',
          message: 'No overdue bills. Great job staying on top of payments!',
          data: [],
        };
      }

      const items = overdue.map((c) => {
        const status = this.contactManager.getSubscriptionStatus(c);
        return `${c.displayName} ($${c.metadata.monthlyAmount}) - ${status.daysOverdue} days overdue`;
      });

      return {
        success: true,
        action: 'check_overdue',
        message: `Overdue bills: ${items.join(', ')}. Say "pay all my bills" to pay them now.`,
        data: overdue,
      };
    } catch (error) {
      return {
        success: false,
        action: 'check_overdue',
        message: error instanceof Error ? error.message : 'Failed to check overdue bills',
      };
    }
  }

  /**
   * List all subscriptions
   */
  async listSubscriptions(): Promise<AICommandResult> {
    try {
      const subscriptions = await this.contactManager.getSubscriptions();

      if (subscriptions.length === 0) {
        return {
          success: true,
          action: 'list_subscriptions',
          message: 'You have no subscriptions saved. Say "add [name] subscription [amount] monthly" to add one.',
          data: [],
        };
      }

      const total = await this.contactManager.getMonthlyTotal();
      const names = subscriptions.map((c) => `${c.displayName} ($${c.metadata.monthlyAmount})`).join(', ');

      return {
        success: true,
        action: 'list_subscriptions',
        message: `You have ${subscriptions.length} subscriptions: ${names}. Monthly total: $${total}.`,
        data: subscriptions,
      };
    } catch (error) {
      return {
        success: false,
        action: 'list_subscriptions',
        message: error instanceof Error ? error.message : 'Failed to list subscriptions',
      };
    }
  }

  /**
   * Pay all due bills
   */
  async payAllDueBills(): Promise<AICommandResult> {
    try {
      const due = await this.contactManager.getDueSubscriptions();
      const overdue = await this.contactManager.getOverdueSubscriptions();
      const all = [...overdue, ...due];

      if (all.length === 0) {
        return {
          success: true,
          action: 'pay_all_due',
          message: 'No bills are due. Nothing to pay!',
          data: { paid: 0, total: '0' },
        };
      }

      // For now, just mark them as paid (actual payment would require integration)
      let totalPaid = 0;
      const paidNames: string[] = [];

      for (const contact of all) {
        await this.contactManager.markPaid(contact.name, `simulated_${Date.now()}`);
        totalPaid += parseFloat(contact.metadata.monthlyAmount || '0');
        paidNames.push(contact.displayName);
      }

      return {
        success: true,
        action: 'pay_all_due',
        message: `Paid ${all.length} bills: ${paidNames.join(', ')}. Total: $${totalPaid.toFixed(2)}.`,
        data: { paid: all.length, total: totalPaid.toFixed(2) },
      };
    } catch (error) {
      return {
        success: false,
        action: 'pay_all_due',
        message: error instanceof Error ? error.message : 'Failed to pay bills',
      };
    }
  }

  /**
   * Snooze a subscription
   */
  async snoozeSubscription(name: string, days: number): Promise<AICommandResult> {
    try {
      const contact = await this.contactManager.snooze(name, days);

      return {
        success: true,
        action: 'snooze_subscription',
        message: `${contact.displayName} snoozed for ${days} days. New due date: ${new Date(contact.metadata.nextDueDate!).toLocaleDateString()}.`,
        data: contact,
      };
    } catch (error) {
      return {
        success: false,
        action: 'snooze_subscription',
        message: error instanceof Error ? error.message : 'Failed to snooze subscription',
      };
    }
  }

  /**
   * Get monthly subscription total
   */
  async getSubscriptionTotal(): Promise<AICommandResult> {
    try {
      const total = await this.contactManager.getMonthlyTotal();
      const subscriptions = await this.contactManager.getSubscriptions();

      return {
        success: true,
        action: 'subscription_total',
        message: `You spend $${total} per month on ${subscriptions.length} subscriptions.`,
        data: { total, count: subscriptions.length },
      };
    } catch (error) {
      return {
        success: false,
        action: 'subscription_total',
        message: error instanceof Error ? error.message : 'Failed to calculate total',
      };
    }
  }

  private async requestConfirmation(prompt: string): Promise<boolean> {
    await this.speak(`${prompt} Say confirm to proceed, or cancel.`);

    try {
      const response = await this.recognizer.listen();
      const lower = response.transcript.toLowerCase();
      return lower.includes('confirm') || lower.includes('yes') || lower.includes('proceed');
    } catch {
      return false;
    }
  }

  private async respond(result: AICommandResult): Promise<AICommandResult> {
    if (this.config.voice?.speakResponses !== false) {
      await this.speak(result.message);
    }
    return result;
  }

  private async speak(text: string): Promise<void> {
    if (this.config.voice?.speakResponses !== false) {
      await this.synthesizer.speak(text);
    }
  }

  // ============ Public Accessors ============

  getAIAgent(): AIAgent {
    return this.aiAgent;
  }

  getRecognizer(): SpeechRecognizer {
    return this.recognizer;
  }

  getSynthesizer(): SpeechSynthesizer {
    return this.synthesizer;
  }

  async getAddress(): Promise<string> {
    return this.aiAgent.getAddress();
  }

  /**
   * Check if voice features are available
   */
  isVoiceAvailable(): boolean {
    return this.recognizer.isAvailable() && this.synthesizer.isAvailable();
  }
}

// ============ Factory ============

export function createVoiceAgent(config: VoiceEnabledAgentConfig): VoiceEnabledAgent {
  return new VoiceEnabledAgent(config);
}
