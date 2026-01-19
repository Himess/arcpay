/**
 * ArcPay Function Declarations for Gemini Function Calling
 *
 * Gemini bu fonksiyonları anlayıp doğrudan çağırabilir
 */

// Schema types for function parameters
const SchemaType = {
  OBJECT: 'object',
  STRING: 'string',
  NUMBER: 'number',
  BOOLEAN: 'boolean',
  ARRAY: 'array'
} as const;

export interface FunctionDeclaration {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * ArcPay function declarations for Gemini Function Calling
 */
export const ARCPAY_FUNCTIONS: FunctionDeclaration[] = [
  // ============ Basic Payments ============
  {
    name: 'pay',
    description: 'Send USDC payment to a recipient address. Use this for simple one-time transfers.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        recipient: {
          type: SchemaType.STRING,
          description: 'Recipient wallet address (0x...) or registered alias'
        },
        amount: {
          type: SchemaType.STRING,
          description: 'Amount in USDC (e.g., "50", "100.50")'
        },
        memo: {
          type: SchemaType.STRING,
          description: 'Optional payment memo or description'
        }
      },
      required: ['recipient', 'amount']
    }
  },

  // ============ Escrow ============
  {
    name: 'createEscrow',
    description: 'Create an escrow to hold funds until conditions are met. Use for secure transactions where payment should be released after work completion or delivery.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        beneficiary: {
          type: SchemaType.STRING,
          description: 'Address that will receive funds when escrow is released'
        },
        amount: {
          type: SchemaType.STRING,
          description: 'Amount to lock in escrow'
        },
        releaseCondition: {
          type: SchemaType.STRING,
          enum: ['approval', 'time', 'milestone'],
          description: 'When to release: approval (manual), time (automatic after duration), milestone (partial releases)'
        },
        duration: {
          type: SchemaType.STRING,
          description: 'Duration for time-based release (e.g., "7d", "24h")'
        },
        description: {
          type: SchemaType.STRING,
          description: 'Description of what the escrow is for'
        }
      },
      required: ['beneficiary', 'amount']
    }
  },

  {
    name: 'releaseEscrow',
    description: 'Release funds from an escrow to the beneficiary. Use when work is completed or conditions are met.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        escrowId: {
          type: SchemaType.STRING,
          description: 'ID of the escrow to release'
        }
      },
      required: ['escrowId']
    }
  },

  {
    name: 'refundEscrow',
    description: 'Refund escrowed funds back to the depositor. Use when work is not completed or there is a dispute.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        escrowId: {
          type: SchemaType.STRING,
          description: 'ID of the escrow to refund'
        },
        reason: {
          type: SchemaType.STRING,
          description: 'Reason for refund'
        }
      },
      required: ['escrowId']
    }
  },

  // ============ Payment Streaming ============
  {
    name: 'createStream',
    description: 'Start a payment stream that continuously sends USDC over time. Use for salaries, subscriptions, or rent payments.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        recipient: {
          type: SchemaType.STRING,
          description: 'Address to stream payments to'
        },
        totalAmount: {
          type: SchemaType.STRING,
          description: 'Total amount to stream'
        },
        duration: {
          type: SchemaType.STRING,
          description: 'Duration of stream (e.g., "30d" for monthly, "1y" for yearly)'
        }
      },
      required: ['recipient', 'totalAmount', 'duration']
    }
  },

  {
    name: 'cancelStream',
    description: 'Cancel an active payment stream. Remaining funds are returned to sender.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        streamId: {
          type: SchemaType.STRING,
          description: 'ID of the stream to cancel'
        }
      },
      required: ['streamId']
    }
  },

  // ============ Agent-to-Agent ============
  {
    name: 'hireAgent',
    description: 'Hire another AI agent to perform a task. Creates an escrow that is released when work is approved.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        agentAddress: {
          type: SchemaType.STRING,
          description: 'Address of the agent to hire'
        },
        task: {
          type: SchemaType.STRING,
          description: 'Description of the task'
        },
        payment: {
          type: SchemaType.STRING,
          description: 'Payment amount for the task'
        },
        deadline: {
          type: SchemaType.STRING,
          description: 'Deadline for task completion (e.g., "24h", "7d")'
        }
      },
      required: ['agentAddress', 'task', 'payment']
    }
  },

  {
    name: 'approveAgentWork',
    description: 'Approve completed work from a hired agent, releasing the escrowed payment.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        workId: {
          type: SchemaType.STRING,
          description: 'ID of the work to approve'
        },
        rating: {
          type: SchemaType.NUMBER,
          description: 'Optional rating 1-5'
        },
        feedback: {
          type: SchemaType.STRING,
          description: 'Optional feedback'
        }
      },
      required: ['workId']
    }
  },

  // ============ Privacy ============
  {
    name: 'payPrivate',
    description: 'Send a private/anonymous payment using stealth addresses. The recipient identity is hidden on-chain.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        stealthAddress: {
          type: SchemaType.STRING,
          description: 'Recipient stealth meta-address'
        },
        amount: {
          type: SchemaType.STRING,
          description: 'Amount to send'
        }
      },
      required: ['stealthAddress', 'amount']
    }
  },

  // ============ Balance & Info ============
  {
    name: 'getBalance',
    description: 'Get the current USDC balance of the agent wallet.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },

  {
    name: 'getSpendingReport',
    description: 'Get a spending report showing recent transactions and budget usage.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        period: {
          type: SchemaType.STRING,
          enum: ['today', 'week', 'month'],
          description: 'Time period for report'
        }
      }
    }
  },

  // ============ Whitelist/Blacklist ============
  {
    name: 'addToWhitelist',
    description: 'Add an address to the trusted whitelist. Only whitelisted addresses can receive payments if whitelist is enabled.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        address: {
          type: SchemaType.STRING,
          description: 'Address to whitelist'
        }
      },
      required: ['address']
    }
  },

  {
    name: 'addToBlacklist',
    description: 'Block an address from receiving payments.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        address: {
          type: SchemaType.STRING,
          description: 'Address to block'
        }
      },
      required: ['address']
    }
  },

  // ============ Invoice Payment (Multimodal) ============
  {
    name: 'payInvoice',
    description: 'Pay an invoice. Can be used after analyzing an invoice image.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        recipient: {
          type: SchemaType.STRING,
          description: 'Payment recipient address extracted from invoice'
        },
        amount: {
          type: SchemaType.STRING,
          description: 'Invoice amount'
        },
        invoiceNumber: {
          type: SchemaType.STRING,
          description: 'Invoice reference number'
        },
        dueDate: {
          type: SchemaType.STRING,
          description: 'Invoice due date'
        }
      },
      required: ['recipient', 'amount']
    }
  },

  // ============ Subscription ============
  {
    name: 'subscribe',
    description: 'Create a recurring subscription payment.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        recipient: {
          type: SchemaType.STRING,
          description: 'Subscription merchant address'
        },
        amount: {
          type: SchemaType.STRING,
          description: 'Subscription amount per period'
        },
        interval: {
          type: SchemaType.STRING,
          enum: ['daily', 'weekly', 'monthly', 'yearly'],
          description: 'Billing interval'
        }
      },
      required: ['recipient', 'amount', 'interval']
    }
  }
];

/**
 * Get function declaration by name
 */
export function getFunctionByName(name: string): FunctionDeclaration | undefined {
  return ARCPAY_FUNCTIONS.find(f => f.name === name);
}
