const supabase = require('../config/supabaseClient');

// Get user's pets (for pet selection)
const getUserPets = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const { data, error } = await supabase
            .from('Pet')
            .select('id, name, type, breed, images')
            .eq('ownerId', userId)
            .order('createdAt', { ascending: false });

        if (error) throw error;

        res.json(data || []);
    } catch (err) {
        console.error('Error fetching user pets:', err);
        res.status(500).json({ error: 'Failed to fetch pets' });
    }
};

// Get list of vets
const getVets = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('User')
            .select('id, name')
            .eq('role', 'Vet');

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        console.error('Error fetching vets:', err);
        res.status(500).json({ error: 'Failed to fetch vets' });
    }
};

// Get user's appointments (including any schedule alerts)
const getAppointments = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        const { data, error } = await supabase
            .from('Appointment')
            .select(`
                id,
                date,
                bookingReason,
                type,
                is_emergency,
                updatedDate,
                pet_id,
                Pet:pet_id (id, name, type, images),
                vetId,
                Vet:vetId (name)
            `)
            .eq('userId', userId)
            .order('date', { ascending: true });

        if (error) throw error;

        // Filter out past appointments
        // Keep if: (updatedDate exists AND is future) OR (updatedDate doesn't exist AND date is future)
        const now = new Date();
        const activeAppointments = (data || []).filter(apt => {
            const effectiveDate = apt.updatedDate ? new Date(apt.updatedDate) : new Date(apt.date);
            return effectiveDate >= now;
        });

        res.json(activeAppointments);
    } catch (err) {
        console.error('Error fetching appointments:', err);
        res.status(500).json({ error: 'Failed to fetch appointments' });
    }
};

// Get schedule alerts (appointments that were rescheduled by admin)
const getScheduleAlerts = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        // Get appointments where original_time is set (meaning it was rescheduled)
        const { data, error } = await supabase
            .from('Appointment')
            .select(`
                id,
                date,
                bookingReason,
                type,
                is_emergency,
                original_time,
                pet_id,
                Pet:pet_id (id, name, type)
            `)
            .eq('userId', userId)
            .not('original_time', 'is', null)
            .order('date', { ascending: true });

        if (error) throw error;

        res.json(data || []);
    } catch (err) {
        console.error('Error fetching schedule alerts:', err);
        res.status(500).json({ error: 'Failed to fetch schedule alerts' });
    }
};

const checkExistingAppointment = async (userId, petId) => {
    const now = new Date().toISOString();
    const { data, error } = await supabase
        .from('Appointment')
        .select('id')
        .eq('userId', userId)
        .eq('pet_id', petId)
        .gte('date', now) // Only checks for future appointments
        .limit(1);

    if (error) throw error;
    return data && data.length > 0;
};

// Book a new appointment
const createAppointment = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { petId, date, bookingReason, vetId, isEmergency } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        if (!petId) {
            return res.status(400).json({ error: 'Please select a pet' });
        }

        if (!date) {
            return res.status(400).json({ error: 'Please select a date and time' });
        }

        const requestedDate = new Date(date);
        const now = new Date();

        if (requestedDate < now) {
            return res.status(400).json({ error: 'Cannot book appointments in the past' });
        }

        if (!bookingReason) {
            return res.status(400).json({ error: 'Please select a reason for visit' });
        }

        // Verify the pet belongs to the user
        const { data: petData, error: petError } = await supabase
            .from('Pet')
            .select('id, ownerId')
            .eq('id', petId)
            .single();

        if (petError || !petData) {
            return res.status(400).json({ error: 'Pet not found' });
        }

        if (petData.ownerId !== userId) {
            return res.status(403).json({ error: 'You can only book appointments for your own pets' });
        }

        // Check availability (Race Condition prevention)
        const appointmentDate = new Date(date).toISOString();
        const { data: conflict, error: conflictError } = await supabase
            .from('Appointment')
            .select('id')
            .eq('date', appointmentDate)
            .limit(1);

        if (conflictError && conflictError.code !== 'PGRST116') { // Ignore "no rows" error if applicable
            console.error('Error checking availability:', conflictError);
        }

        if (conflict && conflict.length > 0) {
            return res.status(409).json({ error: 'This time slot has just been booked. Please choose another time.' });
        }

        // Check if user already has a pending/confirmed appointment for this pet
        const hasExisting = await checkExistingAppointment(userId, petId);
        if (hasExisting) {
            return res.status(400).json({
                error: 'You already have a pending or confirmed appointment for this pet'
            });
        }

        // Create the appointment
        const { data, error } = await supabase
            .from('Appointment')
            .insert({
                userId,
                pet_id: petId,
                date: new Date(date).toISOString(),
                type: (isEmergency || false) ? 'Emergency' : 'Standard',
                bookingReason,
                vetId: vetId || null,
                is_emergency: isEmergency || false
            })
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            message: 'Appointment booked successfully!',
            appointment: data
        });

    } catch (err) {
        console.error('Error booking appointment:', err);
        res.status(500).json({ error: 'Failed to book appointment' });
    }
};

// Cancel an appointment
const cancelAppointment = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;

        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }

        // Verify ownership
        const { data: existing, error: fetchError } = await supabase
            .from('Appointment')
            .select('id, userId')
            .eq('id', id)
            .single();

        if (fetchError || !existing) {
            return res.status(404).json({ error: 'Appointment not found' });
        }

        if (existing.userId !== userId) {
            return res.status(403).json({ error: 'You can only cancel your own appointments' });
        }

        // Update status to CANCELLED
        const { data, error } = await supabase
            .from('Appointment')
            .update({ bookingReason: 'CANCELLED' })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        res.json({
            message: 'Appointment cancelled successfully',
            appointment: data
        });

    } catch (err) {
        console.error('Error cancelling appointment:', err);
        res.status(500).json({ error: 'Failed to cancel appointment' });
    }
};

// Get available time slots for a date
const getAvailableSlots = async (req, res) => {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ error: 'Date is required' });
        }

        // Define available time slots
        const allSlots = [
            '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
            '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
        ];

        // Get booked slots for that date
        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        const { data: bookedAppointments, error } = await supabase
            .from('Appointment')
            .select('date')
            .gte('date', startOfDay.toISOString())
            .lte('date', endOfDay.toISOString());

        if (error) throw error;

        // Extract booked times
        const bookedTimes = (bookedAppointments || []).map(apt => {
            const d = new Date(apt.date);
            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        });

        // Filter available slots
        let availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot));

        // If the date is today, filter out past time slots
        const now = new Date();
        const requestDate = new Date(date);

        // Compare request date and today's date (ignoring time)
        if (requestDate.toDateString() === now.toDateString()) {
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();

            availableSlots = availableSlots.filter(slot => {
                const [slotHour, slotMinute] = slot.split(':').map(Number);
                if (slotHour > currentHour) return true;
                if (slotHour === currentHour && slotMinute > currentMinute) return true;
                return false;
            });
        }

        res.json(availableSlots);

    } catch (err) {
        console.error('Error fetching available slots:', err);
        res.status(500).json({ error: 'Failed to fetch available slots' });
    }
};

module.exports = {
    getUserPets,
    getAppointments,
    getScheduleAlerts,
    createAppointment,
    cancelAppointment,
    getAvailableSlots,
    getVets
};
