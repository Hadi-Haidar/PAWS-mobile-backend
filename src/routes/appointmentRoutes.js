
const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const authenticateUser = require('../middleware/authMiddleware');

router.use(authenticateUser);

router.get('/', appointmentController.getAppointments);
router.post('/', appointmentController.createAppointment);

module.exports = router;
