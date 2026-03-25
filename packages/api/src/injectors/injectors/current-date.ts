import type { PromptInjector, InjectorContext, InjectorResult } from '../types';

/**
 * Current Date/Time Injector
 * Injects the current date and time into the user's message.
 * Supports various formats and timezone configuration.
 */
export const currentDateInjector: PromptInjector = {
  id: 'current_date',
  name: 'Current Date/Time',
  description: 'Prepends the current date and time to the user message',

  async execute(context: InjectorContext, config?: Record<string, unknown>): Promise<InjectorResult> {
    const timezone = (config?.timezone as string) ?? context.user.timezone ?? 'UTC';
    const format = (config?.format as string) ?? 'full';
    const now = new Date();

    let prefix: string;

    switch (format) {
      case 'date_only':
        prefix = `Current Date: ${now.toLocaleDateString('en-US', { timeZone: timezone })}`;
        break;

      case 'time_only':
        prefix = `Current Time: ${now.toLocaleTimeString('en-US', { timeZone: timezone })}`;
        break;

      case 'iso':
        prefix = `Current Date & Time: ${now.toISOString()}`;
        break;

      case 'full':
      default:
        prefix = `Current Date & Time: ${now.toLocaleString('en-US', { timeZone: timezone })} (${timezone})`;
        break;
    }

    return { prefix };
  },
};
