const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// GET all products
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// GET single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (product) {
      res.json(product);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
});

// POST seed
router.post('/seed', async (req, res) => {
  try {
    await Product.deleteMany({});
    const products = [
      { name: 'Wireless Noise-Cancelling Headphones', price: 299.99, description: 'Experience premium sound quality with active noise cancellation. Up to 30 hours of battery life and ultra-comfortable ear cushions.', image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop&q=80', category: 'Audio', countInStock: 10 },
      { name: 'Smart Fitness Watch Pro', price: 199.50, description: 'Track your health, workouts, and sleep with precision. Water-resistant up to 50m with a stunning AMOLED display.', image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&auto=format&fit=crop&q=80', category: 'Wearables', countInStock: 5 },
      { name: 'Ultra-Slim Mechanical Keyboard', price: 129.99, description: 'RGB backlit mechanical keyboard with hot-swappable switches. Perfect for gamers and typists alike.', image: 'https://images.unsplash.com/photo-1595225476474-87563907a212?w=800&auto=format&fit=crop&q=80', category: 'Accessories', countInStock: 15 },
      { name: '4K Ultra HD Drone', price: 499.00, description: 'Capture breathtaking aerial footage with 4K resolution. Includes GPS return-to-home and 30-minute flight time.', image: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&auto=format&fit=crop&q=80', category: 'Electronics', countInStock: 8 },
      { name: 'Portable Bluetooth Speaker', price: 59.99, description: 'Waterproof, rugged, and incredibly loud. Take your music anywhere with 12 hours of playtime.', image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&auto=format&fit=crop&q=80', category: 'Audio', countInStock: 20 },
      { name: 'Ergonomic Wireless Mouse', price: 45.00, description: 'Designed for comfort and precision. Silent clicks and adjustable DPI settings for ultimate productivity.', image: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=800&auto=format&fit=crop&q=80', category: 'Accessories', countInStock: 30 },
      { name: 'VR Headset Elite', price: 399.00, description: 'Immerse yourself in virtual reality with stunning 4K resolution per eye and intuitive motion controllers.', image: 'https://images.unsplash.com/photo-1622979135225-d2ba269cf1ac?w=800&auto=format&fit=crop&q=80', category: 'Gaming', countInStock: 4 },
      { name: 'Professional Webcam 4K', price: 149.99, description: 'Look your best on every call. 4K resolution, auto-focus, and built-in ring light for perfect lighting.', image: 'https://images.unsplash.com/photo-1587826080692-f439cd0b70da?w=800&auto=format&fit=crop&q=80', category: 'Electronics', countInStock: 12 }
    ];
    const created = await Product.insertMany(products);
    res.json({ message: `Seeded ${created.length} products`, products: created });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;