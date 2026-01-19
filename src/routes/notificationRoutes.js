const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const authenticateUser = require('../middleware/authMiddleware');

router.use(authenticateUser);

router.get('/', notificationController.getNotifications);
router.put('/:id/read', notificationController.markAsRead);
router.delete('/:id', notificationController.clearNotifications);
router.delete('/', notificationController.clearNotifications);

module.exports = router;
