import type { PromptInjector } from './types';
import { logger } from '@librechat/data-schemas';

/**
 * Singleton registry for managing prompt injectors.
 * Provides a centralized place to register and retrieve injectors.
 */
class InjectorRegistry {
  private injectors: Map<string, PromptInjector> = new Map();

  /**
   * Register a new injector.
   * @param injector - The injector to register
   * @throws Error if an injector with the same ID is already registered
   */
  register(injector: PromptInjector): void {
    if (this.injectors.has(injector.id)) {
      throw new Error(`Injector with ID "${injector.id}" is already registered.`);
    }
    this.injectors.set(injector.id, injector);
    logger.debug(`[PromptInjection] Registered injector: ${injector.id}`);
  }

  /**
   * Get an injector by ID.
   * @param id - The injector ID
   * @returns The injector if found, undefined otherwise
   */
  get(id: string): PromptInjector | undefined {
    return this.injectors.get(id);
  }

  /**
   * Get all registered injectors.
   * @returns Array of all registered injectors
   */
  getAll(): PromptInjector[] {
    return Array.from(this.injectors.values());
  }

  /**
   * Check if an injector is registered.
   * @param id - The injector ID
   * @returns true if the injector is registered, false otherwise
   */
  has(id: string): boolean {
    return this.injectors.has(id);
  }

  /**
   * Unregister an injector by ID.
   * @param id - The injector ID
   * @returns true if the injector was unregistered, false if it wasn't found
   */
  unregister(id: string): boolean {
    return this.injectors.delete(id);
  }

  /**
   * Clear all registered injectors.
   * Primarily useful for testing.
   */
  clear(): void {
    this.injectors.clear();
  }
}

/**
 * Singleton instance of the injector registry.
 * Exported for use throughout the application.
 */
export const injectorRegistry = new InjectorRegistry();
