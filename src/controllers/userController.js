
const supabase = require('../config/supabaseClient');

const getUserProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { data, error } = await supabase
            .from('User')
            .select('*')
            .eq('id', userId)
            .single();

        if (error) {
            return res.status(404).json({ error: 'User profile not found' });
        }

        res.json(data);
    } catch (err) {
        console.error('Error fetching user profile:', err);
        res.status(500).json({ error: 'Failed to fetch user profile' });
    }
};

module.exports = {
    getUserProfile
};
