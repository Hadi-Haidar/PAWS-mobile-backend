const supabase = require('../config/supabaseClient');

// Get activities for a user
const getActivities = async (req, res) => {
    try {
        const userId = req.user.id;
        const { data, error } = await supabase
            .from('Activity')
            .select('*')
            .eq('userId', userId)
            .order('createdAt', { ascending: false });

        if (error) {
            // If table doesn't exist, return empty array instead of crashing
            if (error.code === '42P01') { // undefined_table
                return res.json([]);
            }
            throw error;
        }
        res.json(data || []);
    } catch (err) {
        console.error('Error fetching activities:', err);
        res.status(500).json({ error: 'Failed to fetch activities' });
    }
};

module.exports = { getActivities };
