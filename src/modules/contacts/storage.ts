/**
 * ArcPay Contacts Module - Storage Adapters
 *
 * Different storage backends for contact persistence.
 */

import type { StorageAdapter } from './types';

/**
 * In-memory storage adapter (non-persistent)
 * Good for testing or when persistence is not needed
 */
export class MemoryStorage implements StorageAdapter {
  private data: Map<string, string> = new Map();

  async get(key: string): Promise<string | null> {
    return this.data.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    this.data.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key);
  }

  async has(key: string): Promise<boolean> {
    return this.data.has(key);
  }

  async keys(): Promise<string[]> {
    return Array.from(this.data.keys());
  }

  async clear(): Promise<void> {
    this.data.clear();
  }
}

/**
 * LocalStorage adapter (browser)
 * Persists contacts in browser localStorage
 */
export class LocalStorageAdapter implements StorageAdapter {
  private prefix: string;

  constructor(prefix: string = 'arcpay_contacts_') {
    this.prefix = prefix;
  }

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async get(key: string): Promise<string | null> {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(this.getKey(key));
  }

  async set(key: string, value: string): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(this.getKey(key), value);
  }

  async delete(key: string): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(this.getKey(key));
  }

  async has(key: string): Promise<boolean> {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(this.getKey(key)) !== null;
  }

  async keys(): Promise<string[]> {
    if (typeof localStorage === 'undefined') return [];
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keys.push(key.substring(this.prefix.length));
      }
    }
    return keys;
  }

  async clear(): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }
}

/**
 * File-based storage adapter (Node.js)
 * Persists contacts to a JSON file
 */
export class FileStorage implements StorageAdapter {
  private filePath: string;
  private data: Map<string, string> = new Map();
  private loaded: boolean = false;

  constructor(filePath: string = '.arcpay/contacts.json') {
    this.filePath = filePath;
  }

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;

    try {
      // Dynamic import for Node.js fs
      const fs = await import('fs').catch(() => null);
      const path = await import('path').catch(() => null);

      if (!fs || !path) {
        this.loaded = true;
        return;
      }

      const fullPath = path.resolve(this.filePath);
      const dir = path.dirname(fullPath);

      // Create directory if needed
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Load existing data
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8');
        const parsed = JSON.parse(content);
        this.data = new Map(Object.entries(parsed));
      }
    } catch {
      // Ignore errors, start with empty data
    }

    this.loaded = true;
  }

  private async save(): Promise<void> {
    try {
      const fs = await import('fs').catch(() => null);
      const path = await import('path').catch(() => null);

      if (!fs || !path) return;

      const fullPath = path.resolve(this.filePath);
      const obj = Object.fromEntries(this.data);
      fs.writeFileSync(fullPath, JSON.stringify(obj, null, 2));
    } catch {
      // Ignore save errors
    }
  }

  async get(key: string): Promise<string | null> {
    await this.ensureLoaded();
    return this.data.get(key) ?? null;
  }

  async set(key: string, value: string): Promise<void> {
    await this.ensureLoaded();
    this.data.set(key, value);
    await this.save();
  }

  async delete(key: string): Promise<void> {
    await this.ensureLoaded();
    this.data.delete(key);
    await this.save();
  }

  async has(key: string): Promise<boolean> {
    await this.ensureLoaded();
    return this.data.has(key);
  }

  async keys(): Promise<string[]> {
    await this.ensureLoaded();
    return Array.from(this.data.keys());
  }

  async clear(): Promise<void> {
    await this.ensureLoaded();
    this.data.clear();
    await this.save();
  }
}

/**
 * Create appropriate storage adapter based on environment
 */
export function createStorage(options?: {
  type?: 'memory' | 'localStorage' | 'file';
  filePath?: string;
  prefix?: string;
}): StorageAdapter {
  const type = options?.type;

  if (type === 'memory') {
    return new MemoryStorage();
  }

  if (type === 'localStorage') {
    return new LocalStorageAdapter(options?.prefix);
  }

  if (type === 'file') {
    return new FileStorage(options?.filePath);
  }

  // Auto-detect environment
  if (typeof localStorage !== 'undefined') {
    return new LocalStorageAdapter(options?.prefix);
  }

  if (typeof process !== 'undefined' && process.versions?.node) {
    return new FileStorage(options?.filePath);
  }

  return new MemoryStorage();
}
