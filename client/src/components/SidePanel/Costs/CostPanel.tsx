import { useMemo } from 'react';
import { DollarSign } from 'lucide-react';
import { Spinner } from '@librechat/client';
import { useGetConversationCost } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { useChatContext } from '~/Providers/ChatContext';

const formatCost = (cost: number): string => {
  if (cost === 0) {
    return '$0.0000';
  }
  if (cost < 0.0001) {
    return `$${cost.toFixed(6)}`;
  }
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(2)}`;
};

export default function CostPanel() {
  const localize = useLocalize();
  const { conversationId } = useChatContext();

  const { data: costData, isLoading } = useGetConversationCost(conversationId ?? null);

  const displayCost = useMemo(() => {
    if (!costData || !costData.hasData) {
      return null;
    }
    return formatCost(costData.totalCost);
  }, [costData]);

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-4">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" aria-hidden="true" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-text-primary">
            {localize('com_sidepanel_conversation_cost')}
          </p>
          <p className="text-xs text-text-secondary">{localize('com_ui_estimated_total_cost')}</p>
        </div>
      </div>

      {displayCost != null ? (
        <div className="mt-4 rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{displayCost}</p>
            <p className="mt-1 text-sm text-green-700 dark:text-green-300">
              {localize('com_ui_total_cost')}
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 rounded-lg border border-dashed border-border-medium bg-transparent p-4">
          <div className="text-center">
            <p className="text-sm text-text-secondary">
              {localize('com_ui_no_cost_data_available')}
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              {localize('com_ui_cost_data_new_conversations')}
            </p>
          </div>
        </div>
      )}

      {costData?.breakdown && costData.hasData && (
        <div className="mt-4 space-y-2 text-xs text-text-secondary">
          <div className="flex justify-between">
            <span>{localize('com_ui_input_tokens')}</span>
            <span className="font-medium text-text-primary">{costData.breakdown.inputTokens.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>{localize('com_ui_output_tokens')}</span>
            <span className="font-medium text-text-primary">{costData.breakdown.outputTokens.toLocaleString()}</span>
          </div>
          {costData.breakdown.cacheWriteTokens > 0 && (
            <div className="flex justify-between">
              <span>{localize('com_ui_cache_write_tokens')}</span>
              <span className="font-medium text-text-primary">{costData.breakdown.cacheWriteTokens.toLocaleString()}</span>
            </div>
          )}
          {costData.breakdown.cacheReadTokens > 0 && (
            <div className="flex justify-between">
              <span>{localize('com_ui_cache_read_tokens')}</span>
              <span className="font-medium text-text-primary">{costData.breakdown.cacheReadTokens.toLocaleString()}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
