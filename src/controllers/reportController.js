const supabase = require('../config/supabaseClient');

const createReport = async (req, res) => {
    try {
        const { userId, subject, description, type } = req.body;

        if (!userId || !subject || !description || !type) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const { data, error } = await supabase
            .from('Report')
            .insert([{ userId, subject, description, type }])
            .select()
            .single();

        if (error) {
            throw error;
        }

        res.status(201).json({ message: 'Report submitted successfully', data });
    } catch (error) {
        console.error('Error creating report:', error);
        res.status(500).json({ error: error.message });
    }
};

const getReports = async (req, res) => {
    try {
        const userId = req.user.id;

        // Fetch reports for the authenticated user
        const { data, error } = await supabase
            .from('Report')
            .select('*')
            .eq('userId', userId)
            .order('createdAt', { ascending: false });

        if (error) {
            throw error;
        }

        res.status(200).json({ data });
    } catch (error) {
        console.error('Error fetching reports:', error);
        res.status(500).json({ error: error.message });
    }
};

const updateReportStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        const { data, error } = await supabase
            .from('Report')
            .update({ status, updatedAt: new Date().toISOString() })
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        res.status(200).json({ message: 'Report updated', data });
    } catch (error) {
        console.error('Error updating report:', error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    createReport,
    getReports,
    updateReportStatus
};
