
const express = require('express');
const router = express.Router();
const petController = require('../controllers/petController');

// Public routes
router.get('/', petController.getPets);
router.get('/:id', petController.getPetById);

module.exports = router;
