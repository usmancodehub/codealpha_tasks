const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const Product = require('./models/Product');

dotenv.config();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Auto-seed on startup
const seedProducts = async () => {
  try {
    const count = await Product.countDocuments();
    if (count === 0) {
      console.log('📦 Empty database. Auto-seeding products...');
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
      await Product.insertMany(products);
      console.log(`✅ Seeded ${products.length} products.`);
    } else {
      console.log(`📊 Database has ${count} products. Skipping seed.`);
    }
  } catch (error) {
    console.error('❌ Seed Error:', error.message);
  }
};

// Database connection
mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('✅ MongoDB Connected');
    await seedProducts();
  })
  .catch(err => console.error('❌ MongoDB Error:', err.message));

// Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/users', require('./routes/users'));
app.use('/api/orders', require('./routes/orders'));

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('');
  console.log('========================================');
  console.log(`🚀 Server: http://localhost:${PORT}`);
  console.log('========================================');
});