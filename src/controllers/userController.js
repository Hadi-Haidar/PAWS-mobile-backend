
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

const deleteUser = async (req, res) => {
    try {
        const userId = req.user.id;

        // Delete user data from the User table
        const { error: deleteError } = await supabase
            .from('User')
            .delete()
            .eq('id', userId);

        if (deleteError) {
            console.error('Error deleting user data:', deleteError);
            return res.status(500).json({ error: 'Failed to delete user data' });
        }

        // Delete the user from Supabase Auth
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(userId);

        if (authDeleteError) {
            console.error('Error deleting auth user:', authDeleteError);
            return res.status(500).json({ error: 'Failed to delete authentication record' });
        }

        res.json({ message: 'User account deleted successfully' });
    } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ error: 'Failed to delete user account' });
    }
};

module.exports = {
    getUserProfile,
    deleteUser
};
