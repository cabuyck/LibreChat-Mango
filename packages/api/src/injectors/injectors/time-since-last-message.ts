import type { PromptInjector, InjectorContext, InjectorResult } from '../types';

/**
 * Time Since Last Message Injector
 * Injects the time elapsed since the user's last message in the conversation.
 * Useful for providing context about conversation gaps.
 */
export const timeSinceLastMessageInjector: PromptInjector = {
  id: 'time_since_last_message',
  name: 'Time Since Last Message',
  description: 'Prepends the time elapsed since the last user message',

  async execute(context: InjectorContext, config?: Record<string, unknown>): Promise<InjectorResult> {
    const { lastMessageTime } = context.conversation;

    // Handle first message case
    if (!lastMessageTime) {
      const firstMessageText = (config?.firstMessageText as string) ?? 'This is the first message.';
      return { prefix: firstMessageText };
    }

    const now = new Date();
    const diffMs = now.getTime() - new Date(lastMessageTime).getTime();
    const format = (config?.format as string) ?? 'human';

    // Human-readable format
    if (format === 'human') {
      const diffMinutes = Math.floor(diffMs / 60000);

      if (diffMinutes < 1) {
        return { prefix: 'Time since last message: less than a minute' };
      }

      if (diffMinutes < 60) {
        const minutes = diffMinutes;
        return {
          prefix: `Time since last message: ${minutes} minute${minutes !== 1 ? 's' : ''}`,
        };
      }

      const diffHours = Math.floor(diffMs / 3600000);

      if (diffHours < 24) {
        return {
          prefix: `Time since last message: ${diffHours} hour${diffHours !== 1 ? 's' : ''}`,
        };
      }

      const diffDays = Math.floor(diffMs / 86400000);
      return {
        prefix: `Time since last message: ${diffDays} day${diffDays !== 1 ? 's' : ''}`,
      };
    }

    // Seconds format (numeric)
    const diffSeconds = Math.floor(diffMs / 1000);
    return {
      prefix: `Time since last message: ${diffSeconds} second${diffSeconds !== 1 ? 's' : ''}`,
    };
  },
};
