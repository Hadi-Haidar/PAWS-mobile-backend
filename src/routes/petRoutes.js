
const express = require('express');
const router = express.Router();
const petController = require('../controllers/petController');

// Public routes
router.get('/', petController.getPets);
router.get('/:id', petController.getPetById);
const authenticateUser = require('../middleware/authMiddleware');

// Protected routes
router.post('/create', authenticateUser, petController.createPet);
router.put('/:id', authenticateUser, petController.updatePet);
router.delete('/:id', authenticateUser, petController.deletePet);

module.exports = router;
