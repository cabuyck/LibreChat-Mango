const express = require('express');
const router = express.Router();
const controller = require('../controllers/ConversationCost');
const { requireJwtAuth } = require('../middleware/');

router.get('/:conversationId', requireJwtAuth, controller);

module.exports = router;
