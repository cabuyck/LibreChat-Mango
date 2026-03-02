const { logger } = require('@librechat/data-schemas');
const { Transaction } = require('~/db/models');

async function getConversationCost(req, res) {
  try {
    const { conversationId } = req.params;

    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required' });
    }

    const transactions = await Transaction.find({
      user: req.user.id,
      conversationId,
    }).lean();

    if (!transactions || transactions.length === 0) {
      return res.status(200).json({
        totalCost: 0,
        hasData: false,
        currency: 'USD',
      });
    }

    let totalCost = 0;
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let totalCacheWriteTokens = 0;
    let totalCacheReadTokens = 0;

    for (const tx of transactions) {
      if (tx.tokenValue) {
        totalCost += Math.abs(tx.tokenValue);
      }

      if (tx.tokenType === 'prompt') {
        if (tx.inputTokens !== undefined) {
          totalPromptTokens += Math.abs(tx.inputTokens);
        }
        if (tx.writeTokens !== undefined) {
          totalCacheWriteTokens += Math.abs(tx.writeTokens);
        }
        if (tx.readTokens !== undefined) {
          totalCacheReadTokens += Math.abs(tx.readTokens);
        }
      } else if (tx.tokenType === 'completion') {
        if (tx.rawAmount !== undefined) {
          totalCompletionTokens += Math.abs(tx.rawAmount);
        }
      }
    }

    const totalInputTokens = totalPromptTokens + totalCacheWriteTokens + totalCacheReadTokens;
    const costInDollars = totalCost / 1000000;

    res.status(200).json({
      totalCost: costInDollars,
      hasData: true,
      currency: 'USD',
      breakdown: {
        inputTokens: totalInputTokens,
        outputTokens: totalCompletionTokens,
        cacheWriteTokens: totalCacheWriteTokens,
        cacheReadTokens: totalCacheReadTokens,
      },
    });
  } catch (error) {
    logger.error('[getConversationCost]', error);
    res.status(500).json({ error: 'Failed to get conversation cost' });
  }
}

module.exports = getConversationCost;
