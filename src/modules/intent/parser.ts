/**
 * Intent Parser - Natural language to structured intent
 */

import type { ParsedIntent, IntentTemplate } from './types';
import { getTemplates } from './templates';

/**
 * Intent parser for natural language commands
 */
export class IntentParser {
  private templates: IntentTemplate[];

  constructor(customTemplates?: IntentTemplate[]) {
    this.templates = getTemplates(customTemplates);
  }

  /**
   * Parse natural language into structured intent
   *
   * @param input - Natural language command
   * @returns Parsed intent with action, params, and confidence
   */
  parse(input: string): ParsedIntent {
    for (const template of this.templates) {
      const match = input.match(template.pattern);
      if (match) {
        return {
          action: template.action,
          params: template.extract(match),
          confidence: this.calculateConfidence(match, template, input),
        };
      }
    }

    // No match found
    return {
      action: 'unknown',
      params: { query: input },
      confidence: 0,
    };
  }

  /**
   * Calculate confidence score based on match quality
   */
  private calculateConfidence(
    match: RegExpMatchArray,
    _template: IntentTemplate,
    input: string
  ): number {
    let confidence = 0.7;

    // Higher confidence if match covers more of the input
    const matchRatio = match[0].length / input.length;
    confidence += matchRatio * 0.2;

    // Higher confidence if more groups are filled
    const filledGroups = match.slice(1).filter((g) => g !== undefined).length;
    const totalGroups = match.length - 1;
    if (totalGroups > 0) {
      confidence += (filledGroups / totalGroups) * 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  /**
   * Get example commands for help
   *
   * @returns Array of example commands
   */
  getExamples(): string[] {
    return this.templates.flatMap((t) => t.examples);
  }

  /**
   * Get supported actions
   *
   * @returns Array of action types
   */
  getSupportedActions(): string[] {
    return [...new Set(this.templates.map((t) => t.action))];
  }

  /**
   * Add custom template
   *
   * @param template - Template to add
   */
  addTemplate(template: IntentTemplate): void {
    this.templates.push(template);
  }

  /**
   * Test if input matches any template
   *
   * @param input - Input to test
   * @returns Whether input matches
   */
  matches(input: string): boolean {
    return this.templates.some((t) => t.pattern.test(input));
  }

  /**
   * Get matching template for input
   *
   * @param input - Input to match
   * @returns Matching template or undefined
   */
  getMatchingTemplate(input: string): IntentTemplate | undefined {
    return this.templates.find((t) => t.pattern.test(input));
  }
}
