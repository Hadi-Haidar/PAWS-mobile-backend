
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticateUser = require('../middleware/authMiddleware');

// Protected routes
router.get('/profile', authenticateUser, userController.getUserProfile);
router.delete('/delete', authenticateUser, userController.deleteUser);

module.exports = router;
