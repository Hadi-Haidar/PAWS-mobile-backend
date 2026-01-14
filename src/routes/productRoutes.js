const express = require('express');
const router = express.Router();
const authenticateUser = require('../middleware/authMiddleware');
const {
    getProducts,
    getProductById,
    createOrderIntent,
    confirmOrder,
    getOrderHistory
} = require('../controllers/productController');

// Public routes
router.get('/products', getProducts);
router.get('/products/:id', getProductById);

// Protected routes (require authentication)
router.post('/order/create-intent', authenticateUser, createOrderIntent);
router.post('/order/confirm', authenticateUser, confirmOrder);
router.get('/orders/history', authenticateUser, getOrderHistory);

module.exports = router;
