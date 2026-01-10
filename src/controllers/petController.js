
const supabase = require('../config/supabaseClient');

// Get all pets with optional filtering
const getPets = async (req, res) => {
    try {
        const { type, search, region, limit = 20, page = 1 } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('Pet')
            .select('*', { count: 'exact' });

        if (type) {
            query = query.eq('type', type);
        }

        if (region) {
            query = query.ilike('location', `%${region}%`);
        }

        if (search) {
            // Search by name or description
            query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
        }

        // Default filter: only 'Stray' (available) pets unless specified otherwise?
        // Requirement does not specify, but usually we show available pets.
        // Let's assume we show all valid pets.

        const { data, error, count } = await query
            .range(offset, offset + limit - 1)
            .order('createdAt', { ascending: false });

        if (error) {
            throw error;
        }

        res.json({
            data,
            meta: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / limit)
            }
        });

    } catch (err) {
        console.error('Error fetching pets:', err);
        res.status(500).json({ error: 'Failed to fetch pets' });
    }
};

// Get single pet by ID
const getPetById = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabase
            .from('Pet')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            return res.status(404).json({ error: 'Pet not found' });
        }

        res.json(data);
    } catch (err) {
        console.error('Error fetching pet:', err);
        res.status(500).json({ error: 'Failed to fetch pet details' });
    }
};

module.exports = {
    getPets,
    getPetById
};
