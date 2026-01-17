const express = require('express');
const router = express.Router();
const authenticateUser = require('../middleware/authMiddleware');
const { getActivities } = require('../controllers/activityController');

router.get('/', authenticateUser, getActivities);

module.exports = router;
