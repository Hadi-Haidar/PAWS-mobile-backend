const supabase = require('../config/supabaseClient');

// Get notifications for the current user
const getNotifications = async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const { data, error } = await supabase
            .from('Notification')
            .select('*')
            .eq('userId', userId)
            .order('createdAt', { ascending: false });

        if (error) throw error;

        res.json(data);
    } catch (err) {
        console.error('Error fetching notifications:', err);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
};

// Mark a single notification as read
const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;

        const { error } = await supabase
            .from('Notification')
            .update({ isRead: true })
            .eq('id', id)
            .eq('userId', userId);

        if (error) throw error;

        res.json({ message: 'Marked as read' });
    } catch (err) {
        console.error('Error marking notification as read:', err);
        res.status(500).json({ error: 'Failed to update notification' });
    }
};

// Clear (delete) all notifications or specific one
const clearNotifications = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { id } = req.params; // Optional ID to delete single

        let query = supabase.from('Notification').delete().eq('userId', userId);

        if (id) {
            query = query.eq('id', id);
        }

        const { error } = await query;
        if (error) throw error;

        res.json({ message: 'Notifications cleared' });
    } catch (err) {
        console.error('Error clearing notifications:', err);
        res.status(500).json({ error: 'Failed to clear notifications' });
    }
};

// Internal Helper to Create Notification (Not exposed as API typically, but used by other controllers)
const createNotification = async (userId, type, title, message, data = {}) => {
    try {
        const { error } = await supabase
            .from('Notification')
            .insert([{ userId, type, title, message, data }]);

        if (error) {
            console.error('Error creating notification:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Exception creating notification:', err);
        return false;
    }
};

module.exports = {
    getNotifications,
    markAsRead,
    clearNotifications,
    createNotification
};
