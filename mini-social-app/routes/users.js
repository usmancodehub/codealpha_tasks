const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');

// Get User Profile
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ msg: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Follow/Unfollow User
router.put('/follow/:id', auth, async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ msg: 'You cannot follow yourself' });
  
  try {
    const userToFollow = await User.findById(req.params.id);
    const currentUser = await User.findById(req.user.id);

    if (userToFollow.followers.includes(req.user.id)) {
        // Unfollow logic
        // (Simplified for brevity)
    } else {
        userToFollow.followers.push(req.user.id);
        currentUser.following.push(req.params.id);
        await userToFollow.save();
        await currentUser.save();
    }
    res.json(userToFollow.followers);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;