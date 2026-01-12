
const express = require('express');
const router = express.Router();
const donationController = require('../controllers/donationController');
const authenticateUser = require('../middleware/authMiddleware');

// Create payment intent (requires auth)
router.post('/create-intent', authenticateUser, donationController.createDonationIntent);

// Confirm donation after payment (requires auth)
router.post('/confirm', authenticateUser, donationController.confirmDonation);

// Get user's donation history (requires auth)
router.get('/history', authenticateUser, donationController.getDonations);

module.exports = router;
