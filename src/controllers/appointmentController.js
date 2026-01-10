
const supabase = require('../config/supabaseClient');

const getAppointments = async (req, res) => {
    try {
        const userId = req.user.id;
        const { data, error } = await supabase
            .from('Appointment')
            .select('*, Pet(*)')
            .eq('userId', userId)
            .order('date', { ascending: true });

        if (error) {
            throw error;
        }

        res.json(data);
    } catch (err) {
        console.error('Error fetching appointments:', err);
        res.status(500).json({ error: 'Failed to fetch appointments' });
    }
};

const createAppointment = async (req, res) => {
    try {
        const userId = req.user.id;
        const { date, type, petId, vetId, is_emergency } = req.body;

        const { data, error } = await supabase
            .from('Appointment')
            .insert([
                {
                    userId,
                    date,
                    type,
                    pet_id: petId,
                    vetId,
                    is_emergency: is_emergency || false,
                    status: 'PENDING'
                }
            ])
            .select();

        if (error) {
            throw error;
        }

        res.status(201).json(data[0]);
    } catch (err) {
        console.error('Error creating appointment:', err);
        res.status(500).json({ error: 'Failed to create appointment' });
    }
};

module.exports = {
    getAppointments,
    createAppointment
};
