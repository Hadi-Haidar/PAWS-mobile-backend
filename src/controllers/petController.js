
const supabase = require('../config/supabaseClient');

// Get all pets with optional filtering
const getPets = async (req, res) => {
    try {
        const { type, search, region, limit = 20, page = 1, ownerId } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('Pet')
            .select('*', { count: 'exact' });

        if (ownerId) {
            query = query.eq('ownerId', ownerId);
        } else {
            // Main feed: only show available pets
            query = query.eq('status', 'Stray');
        }

        if (type) {
            query = query.eq('type', type);
        }

        if (region) {
            query = query.ilike('location', `%${region}%`);
        }

        if (search) {
            const searchTerm = search.trim();

            // Search by name only
            query = query.ilike('name', `%${searchTerm}%`);
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



// Create a new pet (Add Animal)
const createPet = async (req, res) => {
    try {
        const userId = req.user.id;
        const { name, type, breed, age, location, description, latitude, longitude, imageUrl } = req.body;

        // Basic Validation
        if (!name || !type || !location) {
            return res.status(400).json({ error: 'Missing required fields: name, type, location' });
        }

        // Map frontend fields to backend Pet table schema
        // Note: DB Status constraint only allows 'Stray' or 'Adopted'.
        // latitude/longitude are capitalized in Schema text but we should check if they are case sensitive.
        // Usually insert keys are case-sensitive if created with quotes. Schema file showed "Latitude".
        // We will try exact matching.

        const newPet = {
            ownerId: userId,
            name,
            type,
            breed: breed || null,
            age: age ? parseInt(age) : null,
            location,
            description: description || name,
            status: 'Pending', // Default to Pending until approved
            images: imageUrl ? [imageUrl] : [], // JSONB array
            Latitude: latitude ? parseFloat(latitude) : null,
            Longitude: longitude ? parseFloat(longitude) : null
        };

        const { data, error } = await supabase
            .from('Pet')
            .insert([newPet])
            .select()
            .single();

        if (error) {
            throw error;
        }

        res.status(201).json(data);

    } catch (err) {
        console.error('Error creating pet:', err);
        // Return 500 JSON so frontend doesn't crash on "Unexpected character <"
        res.status(500).json({ error: 'Failed to create pet report' });
    }
};

// Update a pet (only owner can update)
const updatePet = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const { name, type, breed, age, location, description, imageUrl } = req.body;

        // First check if the pet exists and belongs to the user
        const { data: existingPet, error: fetchError } = await supabase
            .from('Pet')
            .select('ownerId, name, images')
            .eq('id', id)
            .single();


        if (fetchError || !existingPet) {
            return res.status(404).json({ error: 'Pet not found' });
        }

        if (existingPet.ownerId !== userId) {
            return res.status(403).json({ error: 'You can only edit your own pets' });
        }

        // Build update object with only provided fields
        const updateData = {};
        if (name !== undefined) updateData.name = name;
        if (type !== undefined) updateData.type = type;
        if (breed !== undefined) updateData.breed = breed;
        if (age !== undefined) updateData.age = age ? parseInt(age) : null;
        if (location !== undefined) updateData.location = location;
        if (description !== undefined) updateData.description = description;
        if (imageUrl !== undefined) updateData.images = imageUrl ? [imageUrl] : [];

        if (req.body.status !== undefined) {
            updateData.status = req.body.status;
        } else {
            // If editing details (and not explicitly changing status), reset to Pending
            updateData.status = 'Pending';
        }

        if (req.body.ownerId !== undefined) updateData.ownerId = req.body.ownerId;

        const { data, error } = await supabase
            .from('Pet')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        // --- ACTIVITY LOG (Adoption) ---
        if (req.body.status === 'Adopted' && req.body.ownerId && req.body.ownerId !== userId) {
            try {
                const newOwnerId = req.body.ownerId;
                const oldOwnerId = userId;

                // Alert New Owner (Adopter)
                await supabase.from('Activity').insert({
                    userId: newOwnerId,
                    type: 'ADOPTION',
                    title: 'Adoption Approved!',
                    subtitle: `You are now the proud owner of ${existingPet.name}`,
                    image: existingPet.images?.[0] || null,
                    status: 'Success',
                    color: '#CCFF66'
                });

                // Alert Old Owner (Shelter/User)
                await supabase.from('Activity').insert({
                    userId: oldOwnerId,
                    type: 'ADOPTION',
                    title: 'Pet Adopted',
                    subtitle: `${existingPet.name} has found a new home!`,
                    image: existingPet.images?.[0] || null,
                    status: 'Success',
                    color: '#CCFF66'
                });
            } catch (logError) {
                // Silent failure for activity log
            }
        }

        res.json(data);

    } catch (err) {
        console.error('Error updating pet:', err);
        res.status(500).json({ error: 'Failed to update pet' });
    }
};

// Delete a pet (only owner can delete)
const deletePet = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        // First check if the pet exists and belongs to the user
        const { data: existingPet, error: fetchError } = await supabase
            .from('Pet')
            .select('ownerId')
            .eq('id', id)
            .single();

        if (fetchError || !existingPet) {
            return res.status(404).json({ error: 'Pet not found' });
        }

        if (existingPet.ownerId !== userId) {
            return res.status(403).json({ error: 'You can only delete your own pets' });
        }

        const { error } = await supabase
            .from('Pet')
            .delete()
            .eq('id', id);

        if (error) {
            throw error;
        }

        res.json({ message: 'Pet deleted successfully' });

    } catch (err) {
        console.error('Error deleting pet:', err);
        res.status(500).json({ error: 'Failed to delete pet' });
    }
};

module.exports = {
    getPets,
    getPetById,
    createPet,
    updatePet,
    deletePet
};
