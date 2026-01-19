const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authenticateUser = require('../middleware/authMiddleware');

// Public/User routes (Authenticate usually needed)
// Assuming authenticateUser middleware populates req.user
// But for consistency with other routes, we might accept userId in body and just trust headers if backend checks them.
// The controller accepts userId in body.

router.post('/', authenticateUser, reportController.createReport);
router.get('/', authenticateUser, reportController.getReports); // In real app, restrict to Admin
router.patch('/:id/status', authenticateUser, reportController.updateReportStatus); // In real app, restrict to Admin

module.exports = router;
