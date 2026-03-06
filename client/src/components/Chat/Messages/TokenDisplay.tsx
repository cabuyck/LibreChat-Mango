import React, { memo } from 'react';
import type { TMessage } from 'librechat-data-provider';
import { cn } from '~/utils';

type TokenDisplayProps = {
  message: TMessage;
  isLast: boolean;
};

/**
 * Displays token information on message hover for assistant messages only
 * Shows: "Tokens in: x out: y cache hit: ✓/✗"
 */
const TokenDisplay = ({ message, isLast }: TokenDisplayProps) => {
  const { isCreatedByUser, inputTokens = 0, outputTokens = 0, cacheReadTokens = 0, cacheWriteTokens = 0 } = message;

  // Only show for assistant messages
  if (isCreatedByUser) {
    return null;
  }

  // Don't render if no token data available yet
  if (inputTokens === 0 && outputTokens === 0) {
    return null;
  }

  // Determine cache status: show checkmark if there are cache reads, X if there are cache writes
  const hasCacheHit = cacheReadTokens > 0;
  const hasCacheWrite = cacheWriteTokens > 0;
  const cacheIndicator = hasCacheHit ? '✓' : hasCacheWrite ? '✗' : '–';

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs text-text-secondary-alt',
        'md:group-hover:visible md:group-focus-within:visible',
        'md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100',
        !isLast && 'md:group-hover:opacity-100',
        'transition-opacity duration-200',
      )}
    >
      <span className="font-medium text-text-primary">Tokens</span>
      <span>in: {inputTokens.toLocaleString()}</span>
      <span>out: {outputTokens.toLocaleString()}</span>
      <span>cache hit: {cacheIndicator}</span>
    </div>
  );
};

export default memo(TokenDisplay);
