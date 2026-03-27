import React, { memo } from 'react';
import type { TMessage } from 'librechat-data-provider';
import { cn } from '~/utils';

type TokenDisplayProps = {
  message: TMessage;
  isLast: boolean;
};

const TokenDisplay = ({ message, isLast }: TokenDisplayProps) => {
  const {
    isCreatedByUser,
    inputTokens = 0,
    outputTokens = 0,
    cacheReadTokens = 0,
    cacheWriteTokens = 0,
  } = message;

  if (isCreatedByUser) {
    return null;
  }

  if (inputTokens === 0 && outputTokens === 0) {
    return null;
  }

  const hasCacheHit = cacheReadTokens > 0;
  const hasCacheWrite = cacheWriteTokens > 0;
  const cacheIndicator = hasCacheHit ? 'yes' : hasCacheWrite ? 'no' : '-';

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
