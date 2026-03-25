/**
 * Context object passed to each injector during execution.
 * Contains all relevant information needed for injection.
 */
export interface InjectorContext {
  user: {
    id: string;
    username?: string;
    email?: string;
    timezone?: string;
  };
  agent: {
    id: string;
    name?: string;
  };
  conversation: {
    id: string;
    lastMessageTime?: Date;
  };
  userMessage: string;
}

/**
 * Result returned by an injector execution.
 * Contains the text to be prepended to the user's message.
 */
export interface InjectorResult {
  prefix: string;
  metadata?: Record<string, unknown>;
}

/**
 * Interface that all prompt injectors must implement.
 * Provides a plugin-style architecture for extending prompt injection.
 */
export interface PromptInjector {
  /** Unique identifier for this injector */
  id: string;
  /** Human-readable name for this injector */
  name: string;
  /** Description of what this injector does */
  description: string;
  /**
   * Execute the injector to generate the prompt prefix.
   * @param context - The injection context containing user, agent, and conversation data
   * @param config - Optional configuration specific to this injector
   * @returns The injection result containing the prefix text
   */
  execute(context: InjectorContext, config?: Record<string, unknown>): Promise<InjectorResult>;
}

/**
 * Custom error class for injector-related errors.
 * Allows for fault-tolerant operation where individual injector failures don't break the system.
 */
export class InjectorError extends Error {
  constructor(
    message: string,
    public readonly injectorId: string,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'InjectorError';
  }
}
