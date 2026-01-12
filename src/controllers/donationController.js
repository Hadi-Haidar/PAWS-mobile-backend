
const supabase = require('../config/supabaseClient');
const Stripe = require('stripe');

// Initialize Stripe with secret key from environment
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

// Create a payment intent for donation
const createDonationIntent = async (req, res) => {
    try {
        // Check if Stripe is configured
        if (!stripe) {
            return res.status(503).json({ error: 'Payment service not configured. Please add STRIPE_SECRET_KEY to environment.' });
        }

        const userId = req.user?.id;
        const { amount, currency = 'USD', message } = req.body;

        // Validate amount
        if (!amount || amount < 1) {
            return res.status(400).json({ error: 'Amount must be at least $1' });
        }

        // Convert to cents for Stripe
        const amountInCents = Math.round(amount * 100);

        // Create a PaymentIntent with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: currency.toLowerCase(),
            metadata: {
                userId: userId || 'anonymous',
                message: message || '',
                type: 'donation'
            }
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });

    } catch (err) {
        console.error('Error creating payment intent:', err);
        res.status(500).json({ error: 'Failed to create payment intent' });
    }
};

// Confirm donation was successful and save to database
const confirmDonation = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { paymentIntentId, amount, currency = 'USD', message } = req.body;

        if (!paymentIntentId || !amount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Verify payment intent with Stripe
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        if (paymentIntent.status !== 'succeeded') {
            return res.status(400).json({ error: 'Payment was not successful' });
        }

        // Save donation to database
        const { data, error } = await supabase
            .from('Donation')
            .insert([{
                amount: parseFloat(amount),
                currency: currency.toUpperCase(),
                message: message || null,
                userId: userId || null
            }])
            .select()
            .single();

        if (error) {
            throw error;
        }

        res.status(201).json({
            message: 'Donation recorded successfully!',
            donation: data
        });

    } catch (err) {
        console.error('Error confirming donation:', err);
        res.status(500).json({ error: 'Failed to record donation' });
    }
};

// Get user's donation history
const getDonations = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { data, error } = await supabase
            .from('Donation')
            .select('*')
            .eq('userId', userId)
            .order('createdAt', { ascending: false });

        if (error) {
            throw error;
        }

        // Calculate total
        const total = data.reduce((sum, d) => sum + parseFloat(d.amount), 0);

        res.json({
            donations: data,
            total: total,
            count: data.length
        });

    } catch (err) {
        console.error('Error fetching donations:', err);
        res.status(500).json({ error: 'Failed to fetch donation history' });
    }
};

module.exports = {
    createDonationIntent,
    confirmDonation,
    getDonations
};
