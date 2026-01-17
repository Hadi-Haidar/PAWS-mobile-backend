const supabase = require('../config/supabaseClient');
const Stripe = require('stripe');

// Initialize Stripe with secret key from environment
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;

// Allowed product categories
const ALLOWED_CATEGORIES = ['All', 'Food', 'Accessories', 'Medical'];

// Get all products
const getProducts = async (req, res) => {
    try {
        const { category } = req.query;

        // Validate category if provided
        if (category && !ALLOWED_CATEGORIES.includes(category)) {
            return res.status(400).json({ error: 'Invalid category. Allowed categories: All, Food, Accessories, Medical' });
        }

        let query = supabase
            .from('Product')
            .select('*')
            .gt('stock', 0) // Only show products in stock
            .order('id', { ascending: true });

        if (category && category !== 'All') {
            query = query.ilike('category', category);
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        res.json(data);
    } catch (err) {
        console.error('Error fetching products:', err);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
};

// Get single product by ID
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('Product')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            throw error;
        }

        if (!data) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.json(data);
    } catch (err) {
        console.error('Error fetching product:', err);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
};

// Create order payment intent
const createOrderIntent = async (req, res) => {
    try {
        // Check if Stripe is configured
        if (!stripe) {
            return res.status(503).json({ error: 'Payment service not configured. Please add STRIPE_SECRET_KEY to environment.' });
        }

        const userId = req.user?.id;
        const { items, totalAmount } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Cart items are required' });
        }

        if (!totalAmount || totalAmount < 1) {
            return res.status(400).json({ error: 'Total amount must be at least $1' });
        }

        // Verify stock availability for all items
        for (const item of items) {
            const { data: product, error } = await supabase
                .from('Product')
                .select('id, name, stock, price')
                .eq('id', item.productId)
                .single();

            if (error || !product) {
                return res.status(400).json({ error: `Product not found: ${item.productId}` });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({ error: `Insufficient stock for ${product.name}. Available: ${product.stock}` });
            }
        }

        // Convert to cents for Stripe
        const amountInCents = Math.round(totalAmount * 100);

        // Create a PaymentIntent with Stripe
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd',
            metadata: {
                userId: userId || 'anonymous',
                items: JSON.stringify(items),
                type: 'shop_order'
            }
        });

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });

    } catch (err) {
        console.error('Error creating order intent:', err);
        res.status(500).json({ error: 'Failed to create payment intent' });
    }
};

// Confirm order and update stock/income
const confirmOrder = async (req, res) => {
    try {
        const userId = req.user?.id;
        const { paymentIntentId, items, totalAmount, address, phoneNumber } = req.body;

        if (!paymentIntentId || !items || !totalAmount) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Verify payment intent with Stripe
        if (stripe) {
            const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

            if (paymentIntent.status !== 'succeeded') {
                return res.status(400).json({ error: 'Payment was not successful' });
            }
        }

        // Process each item: decrease stock and increase income
        for (const item of items) {
            // Get current product data
            const { data: product, error: fetchError } = await supabase
                .from('Product')
                .select('id, stock, income, price')
                .eq('id', item.productId)
                .single();

            if (fetchError || !product) {
                console.error('Product fetch error:', fetchError);
                continue;
            }

            const newStock = product.stock - item.quantity;
            const itemIncome = item.price * item.quantity;
            const newIncome = (product.income || 0) + itemIncome;

            // Update product stock and income
            const { error: updateError } = await supabase
                .from('Product')
                .update({
                    stock: newStock,
                    income: newIncome
                })
                .eq('id', item.productId);

            if (updateError) {
                console.error('Product update error:', updateError);
            }
        }

        // Create order record
        const { data: order, error: orderError } = await supabase
            .from('Order')
            .insert([{
                totalAmount: parseFloat(totalAmount),
                status: 'COMPLETED',
                type: 'SHOP_ORDER',
                userId: userId || null,
                items: items,
                product_id: items[0]?.productId || null, // Primary product for FK
                address: address || null,
                phoneNumber: phoneNumber || null
            }])
            .select()
            .single();

        if (orderError) {
            console.error('Order creation error:', orderError);
        } else {
            // --- ACTIVITY LOG (User) ---
            try {
                // If order is null (RLS hidden), use placeholder or timestamp
                const orderId = (order && order.id) ? String(order.id) : `REF-${Date.now()}`;

                await supabase.from('Activity').insert({
                    userId,
                    type: 'SHOP',
                    title: 'Order Confirmed',
                    subtitle: `Order #${orderId.split('-')[0]} placed successfully`,
                    status: 'Confirmed',
                    color: '#FFB7B2',
                    details: {
                        products: items, // Contains productId, name, price, quantity
                        totalAmount: parseFloat(totalAmount),
                        orderId: orderId,
                        deliveryAddress: address,
                        contactPhone: phoneNumber
                    }
                });

            } catch (logError) {
                console.error('CRITICAL: Failed to log activity:', logError);
            }
        }

        res.status(201).json({
            message: 'Order completed successfully!',
            order: order
        });

    } catch (err) {
        console.error('Error confirming order:', err);
        res.status(500).json({ error: 'Failed to complete order' });
    }
};

// Get user's order history
const getOrderHistory = async (req, res) => {
    try {
        const userId = req.user?.id;

        if (!userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const { data, error } = await supabase
            .from('Order')
            .select('*')
            .eq('userId', userId)
            .eq('type', 'SHOP_ORDER')
            .order('createdAt', { ascending: false });

        if (error) {
            throw error;
        }

        res.json(data);
    } catch (err) {
        console.error('Error fetching order history:', err);
        res.status(500).json({ error: 'Failed to fetch order history' });
    }
};

module.exports = {
    getProducts,
    getProductById,
    createOrderIntent,
    confirmOrder,
    getOrderHistory
};
