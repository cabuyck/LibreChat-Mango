import { executeInjectors } from '~/injectors';
import type { InjectorContext } from '~/injectors/types';
import { logger } from '@librechat/data-schemas';
import type { NextFunction, Request as ServerRequest, Response as ServerResponse } from 'express';

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
  try {
    const agent = req.body?.agent;

    // Skip if no agent, no prompt injection config, or no user message
    if (!agent?.prompt_injection || !req.body?.text) {
      return next();
    }

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
      req.body.text = `${injectedPrefix}\n\n${req.body.text}`;
      logger.debug(`[PromptInjection] Applied ${injectedPrefix.length} characters of context`);
    }

    next();
  } catch (error) {
    // Log error but don't break the request
    logger.error('[PromptInjection] Middleware error', error);
    next();
  }
}
