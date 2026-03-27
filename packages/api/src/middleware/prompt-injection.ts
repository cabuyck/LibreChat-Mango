import { executeInjectors } from '~/injectors';
import type { InjectorContext } from '~/injectors/types';
import { logger } from '@librechat/data-schemas';
import type { PromptInjectionConfig } from '@librechat/data-schemas';
import type { NextFunction, Request as ServerRequest, Response as ServerResponse } from 'express';

// CRITICAL: Log immediately when module is loaded to verify it's being imported
logger.info('[PromptInjection] Middleware module loaded!');

/**
 * Helper function to get the agent with prompt injection configuration.
 * If req.body.agent exists with prompt_injection, returns it.
 * Otherwise, fetches the agent from the database using agent_id.
 *
 * @param req - The Express request object
 * @returns The agent object with prompt_injection, or undefined
 */
async function getAgentWithInjection(req: ServerRequest): Promise<{
  agent?: { id: string; name?: string; prompt_injection?: PromptInjectionConfig };
  agent_id?: string;
}> {
  const { agent_id } = req.body;

  // If agent already exists in request body with prompt_injection, use it
  if (req.body?.agent?.prompt_injection) {
    logger.info('[PromptInjection] Using agent from request body');
    return { agent: req.body.agent, agent_id };
  }

  // Otherwise, fetch from database using agent_id
  if (!agent_id) {
    logger.info('[PromptInjection] No agent_id in request');
    return {};
  }

  try {
    logger.info(`[PromptInjection] Fetching agent from database: ${agent_id}`);
    const { getAgent } = await import('~/models/Agent');
    const agent = await getAgent({ id: agent_id });

    if (agent) {
      logger.info(`[PromptInjection] Found agent: ${agent.id} (${agent.name})`);
      logger.info(`[PromptInjection] Agent has prompt_injection: ${!!agent.prompt_injection}`);
      // Store in req.body for downstream use
      req.body.agent = agent;
      return { agent, agent_id };
    }

    logger.warn(`[PromptInjection] Agent not found: ${agent_id}`);
    return { agent_id };
  } catch (error) {
    logger.error('[PromptInjection] Failed to fetch agent', error);
    return { agent_id };
  }
}

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
  if (!conversationId || !userId) {
    return undefined;
  }

  try {
    // Dynamically import Message to avoid circular dependencies
    // The Message model is in the legacy /api directory
    const { getMessages } = await import('~/models/Message');

    // Get all messages for this conversation and user, sorted by creation date
    const messages = await getMessages(
      {
        conversationId,
        user: userId,
        sender: 'User', // Only get user messages, not assistant responses
      },
      'createdAt', // Only select the createdAt field
    );

    // Return the createdAt timestamp of the most recent message
    if (messages && messages.length > 0) {
      return messages[messages.length - 1].createdAt;
    }

    return undefined;
  } catch (error) {
    logger.error('[PromptInjection] Failed to fetch last message time', error);
    return undefined;
  }
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
  req: ServerRequest,
  res: ServerResponse,
  next: NextFunction,
): Promise<void> {
  // CRITICAL: Log EVERY time the middleware is called
  logger.info('[PromptInjection] ===== MIDDLEWARE CALLED =====');

  try {
    logger.info('[PromptInjection] Request body keys:', Object.keys(req.body || {}));
    logger.info('[PromptInjection] req.body.agent:', req.body?.agent ? 'EXISTS' : 'MISSING');
    logger.info('[PromptInjection] req.body.agent_id:', req.body?.agent_id ? `EXISTS: ${req.body.agent_id}` : 'MISSING');
    logger.info('[PromptInjection] req.body.text:', req.body?.text ? `"${req.body.text}"` : 'MISSING');

    // Get agent (either from request body or fetch from database)
    const { agent } = await getAgentWithInjection(req);

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
