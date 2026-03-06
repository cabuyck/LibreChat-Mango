import React, { memo, useEffect } from 'react';
import { useLocalize } from '~/hooks';
import type { TMessage } from 'librechat-data-provider';
import { cn } from '~/utils';

type TokenDisplayProps = {
  message: TMessage;
  isLast: boolean;
};

/**
 * Determines the cache status of a message based on its token breakdown
 * @param message - The message to check
 * @returns The cache status: 'write' | 'hit' | 'none' | null
 */
function getCacheStatus(message: TMessage): 'write' | 'hit' | 'none' | null {
  const { cacheWriteTokens = 0, cacheReadTokens = 0 } = message;

  if (cacheWriteTokens > 0) {
    return 'write';
  }
  if (cacheReadTokens > 0) {
    return 'hit';
  }
  if (cacheWriteTokens === 0 && cacheReadTokens === 0) {
    return 'none';
  }
  return null;
}

/**
 * Formats a number with thousand separators
 */
function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Displays token information on message hover
 * - For user messages: shows input token count + cache status
 * - For AI messages: shows output token count + cache status
 */
const TokenDisplay = ({ message, isLast }: TokenDisplayProps) => {
  const localize = useLocalize();
  const { isCreatedByUser, inputTokens = 0, outputTokens = 0 } = message;

  // Debug logging to help troubleshoot
  useEffect(() => {
    console.log('[TokenDisplay] Message:', {
      messageId: message.messageId,
      isCreatedByUser,
      inputTokens,
      outputTokens,
    });
  }, [message, isCreatedByUser, inputTokens, outputTokens]);

  // Get the appropriate token count based on message type
  const tokenCount = isCreatedByUser ? inputTokens : outputTokens;
  const tokenLabel = isCreatedByUser
    ? localize('com_ui_input_tokens')
    : localize('com_ui_output_tokens');

  const cacheStatus = getCacheStatus(message);

  // For now, always render to test positioning
  // TODO: Remove this when token data is properly populated
  const hasTokenData = tokenCount > 0;

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-xs text-text-secondary-alt',
        'md:group-hover:visible md:group-focus-within:visible',
        'md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100',
        !isLast && 'md:group-hover:opacity-100',
        'transition-opacity duration-200',
      )}
    >
      {/* Token Count or placeholder */}
      {hasTokenData ? (
        <span className="flex items-center gap-1">
          <span>{tokenLabel}:</span>
          <span className="font-medium text-text-primary">{formatNumber(tokenCount)}</span>
        </span>
      ) : (
        <span className="text-text-tertiary opacity-60">
          {isCreatedByUser ? 'No token data (user)' : 'No token data (assistant)'}
        </span>
      )}

      {/* Cache Status Badge */}
      {hasTokenData && cacheStatus !== null && cacheStatus !== 'none' && (
        <span
          className={cn(
            'rounded px-1.5 py-0.5 text-[10px] font-medium',
            cacheStatus === 'write' &&
              'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
            cacheStatus === 'hit' &&
              'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
          )}
        >
          {cacheStatus === 'write'
            ? localize('com_ui_cache_write')
            : localize('com_ui_cache_hit')}
        </span>
      )}
    </div>
  );
};

export default memo(TokenDisplay);
