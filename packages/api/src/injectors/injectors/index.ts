import { injectorRegistry } from '../registry';
import { currentDateInjector } from './current-date';
import { timeSinceLastMessageInjector } from './time-since-last-message';

/**
 * Register all built-in prompt injectors.
 * This function should be called during application startup.
 */
export function registerBuiltinInjectors(): void {
  injectorRegistry.register(currentDateInjector);
  injectorRegistry.register(timeSinceLastMessageInjector);
}

// Auto-register built-in injectors on module load
registerBuiltinInjectors();
