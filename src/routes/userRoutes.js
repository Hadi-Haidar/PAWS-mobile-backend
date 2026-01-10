
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticateUser = require('../middleware/authMiddleware');

// Protected routes
router.get('/profile', authenticateUser, userController.getUserProfile);

module.exports = router;
