const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

router.get('/history/:userId/:otherUserId', chatController.getMessages);
router.get('/inbox/:userId', chatController.getInbox);

module.exports = router;
