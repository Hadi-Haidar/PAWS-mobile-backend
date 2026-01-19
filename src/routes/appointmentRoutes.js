const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const authenticateUser = require('../middleware/authMiddleware');

// All routes require authentication
router.use(authenticateUser);

// Get user's pets for selection
router.get('/pets', appointmentController.getUserPets);

// Get user's appointments
router.get('/', appointmentController.getAppointments);

// Get schedule alerts (rescheduled appointments)
router.get('/alerts', appointmentController.getScheduleAlerts);

// Get available time slots for a date
router.get('/slots', appointmentController.getAvailableSlots);

// Get list of vets
router.get('/vets', appointmentController.getVets);

// Book a new appointment
router.post('/', appointmentController.createAppointment);

// Cancel an appointment
router.delete('/:id', appointmentController.cancelAppointment);

// Update/Reschedule an appointment
router.put('/:id', appointmentController.updateAppointment);

module.exports = router;
