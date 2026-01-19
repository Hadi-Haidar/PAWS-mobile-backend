const express = require('express');
const router = express.Router();
const { generateRecommendation } = require('../controllers/aiController');

router.post('/recommend', generateRecommendation);

module.exports = router;
