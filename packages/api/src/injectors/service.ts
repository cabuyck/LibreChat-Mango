import type { PromptInjectionConfig } from 'librechat-data-provider';
import type { InjectorContext } from './types';
import { injectorRegistry } from './registry';
import { logger } from '@librechat/data-schemas';

/**
 * Execute enabled injectors from the configuration.
 * Combines results from all enabled injectors into a single string.
 * Individual injector failures are logged but don't prevent other injectors from running.
 *
 * @param config - The prompt injection configuration from the agent
 * @param context - The injection context containing user, agent, and conversation data
 * @returns The combined prefix text from all successful injectors, or empty string if none
 */
export async function executeInjectors(
  config: PromptInjectionConfig | undefined,
  context: InjectorContext,
): Promise<string> {
  if (!config || Object.keys(config).length === 0) {
    return '';
  }

  const results: string[] = [];

  for (const [injectorId, injectorConfig] of Object.entries(config)) {
    if (!injectorConfig.enabled) {
      continue;
    }

    try {
      const injector = injectorRegistry.get(injectorId);
      if (!injector) {
        logger.warn(`[PromptInjection] Injector not found: ${injectorId}`);
        continue;
      }

      const result = await injector.execute(context, injectorConfig.config);
      if (result.prefix) {
        results.push(result.prefix);
      }
    } catch (error) {
      // Log error but continue with other injectors (fault tolerance)
      logger.error(
        `[PromptInjection] Injector "${injectorId}" failed: ${error instanceof Error ? error.message : String(error)}`,
        error,
      );
    }
  }

  // Join all non-empty results with double newlines
  return results.filter(Boolean).join('\n\n');
}
