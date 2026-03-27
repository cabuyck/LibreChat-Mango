import { executeInjectors } from '~/injectors';
import type { InjectorContext } from '~/injectors/types';
import { logger } from '@librechat/data-schemas';
import type { PromptInjectionConfig } from '@librechat/data-schemas';
import type { NextFunction, Request as ServerRequest, Response as ServerResponse } from 'express';
import type { Types } from 'mongoose';

interface AuthenticatedRequest extends ServerRequest {
  user?: {
    id: string;
    _id: Types.ObjectId;
    username?: string;
    email?: string;
    timezone?: string;
  };
}

// CRITICAL: Log immediately when module is loaded to verify it's being imported
logger.info('[PromptInjection] Middleware module loaded!');

/**
 * Helper function to get the timestamp of the last user message in a conversation.
 * This is used by the time_since_last_message injector.
 *
 * @param conversationId - The conversation ID to query
 * @param userId - The user ID to filter by
 * @returns The timestamp of the last message, or undefined if not found
 */
async function getLastMessageTime(
  conversationId: string,
  userId: string,
): Promise<Date | undefined> {
  // TODO: Implement message time fetching
  // For now, return undefined to treat every message as first message
  return undefined;
}

/**
 * Express middleware to apply prompt injection to agent chat messages.
 *
 * This middleware:
 * 1. Checks if the request is for an agent with prompt injection enabled
 * 2. Builds the injector context with user, agent, and conversation data
 * 3. Executes all enabled injectors
 * 4. Prepends the injected content to the user's message
 *
 * The middleware is fault-tolerant: individual injector failures don't break the request.
 *
 * @param req - The Express request object
 * @param res - The Express response object (not used, but required by Express middleware signature)
 * @param next - The Express next function to continue the middleware chain
 */
export async function applyPromptInjection(
  req: AuthenticatedRequest,
  res: ServerResponse,
  next: NextFunction,
): Promise<void> {
  // CRITICAL: Log EVERY time the middleware is called
  logger.info('[PromptInjection] ===== MIDDLEWARE CALLED =====');

  try {
    logger.info('[PromptInjection] Request body keys:', Object.keys(req.body || {}));
    logger.info('[PromptInjection] req.body.agent:', req.body?.agent ? 'EXISTS' : 'MISSING');
    logger.info('[PromptInjection] req.body.text:', req.body?.text ? `"${req.body.text}"` : 'MISSING');

    const agent = req.body?.agent;

    // Debug logging
    logger.info('[PromptInjection] Agent data:', agent ? { id: agent.id, name: agent.name, hasPromptInjection: !!agent?.prompt_injection, promptInjection: agent?.prompt_injection } : 'No agent');

    // Skip if no agent, no prompt injection config, or no user message
    if (!agent?.prompt_injection || !req.body?.text) {
      logger.info('[PromptInjection] Skipping - no agent/prompt_injection, or no text');
      return next();
    }

    logger.info('[PromptInjection] Config:', agent.prompt_injection);

    // Get last message time (returns undefined for new conversations or on error)
    const lastMessageTime = await getLastMessageTime(
      req.body.conversationId,
      req.user?.id,
    );

    // Build the injector context
    const injectorContext: InjectorContext = {
      user: {
        id: req.user?.id ?? '',
        username: req.user?.username,
        email: req.user?.email,
        timezone: req.user?.timezone as string | undefined,
      },
      agent: {
        id: agent.id,
        name: agent.name,
      },
      conversation: {
        id: req.body.conversationId ?? '',
        lastMessageTime,
      },
      userMessage: req.body.text,
    };

    // Execute all enabled injectors
    const injectedPrefix = await executeInjectors(agent.prompt_injection, injectorContext);

    // Prepend the injected content to the user's message
    if (injectedPrefix) {
      const originalText = req.body.text;
      req.body.text = `${injectedPrefix}\n\n${originalText}`;
      logger.info(`[PromptInjection] ✓✓✓ APPLIED INJECTION! ✓✓✓`);
      logger.info(`[PromptInjection] Original: "${originalText}"`);
      logger.info(`[PromptInjection] Injected: "${injectedPrefix}"`);
      logger.info(`[PromptInjection] Final: "${req.body.text}"`);
    } else {
      logger.warn('[PromptInjection] No injectors produced output');
    }

    next();
  } catch (error) {
    // Log error but don't break the request
    logger.error('[PromptInjection] Middleware error', error);
    next();
  }
}
