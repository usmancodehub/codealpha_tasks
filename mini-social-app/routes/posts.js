const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const User = require('../models/User');

// Create Post
router.post('/', auth, async (req, res) => {
  try {
    const newPost = new Post({
      content: req.body.content,
      author: req.user.id
    });
    const post = await newPost.save();
    const populatedPost = await Post.findById(post._id).populate('author', 'username avatar');
    res.json(populatedPost);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Get All Posts (Feed)
router.get('/', auth, async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ date: -1 })
      .populate('author', 'username avatar')
      .populate({
        path: 'comments',
        populate: { path: 'author', select: 'username avatar' }
      });
    res.json(posts);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Like/Unlike Post
router.put('/like/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (post.likes.filter(like => like.toString() === req.user.id).length > 0) {
      const removeIndex = post.likes.map(like => like.toString()).indexOf(req.user.id);
      post.likes.splice(removeIndex, 1);
      await post.save();
      return res.json(post.likes);
    }
    post.likes.unshift(req.user.id);
    await post.save();
    res.json(post.likes);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// Comment on Post
router.post('/comment/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    const newComment = new Comment({
      text: req.body.text,
      post: post._id,
      author: req.user.id
    });
    const comment = await newComment.save();
    post.comments.unshift(comment.id);
    await post.save();
    
    const populatedComment = await Comment.findById(comment._id).populate('author', 'username avatar');
    res.json(populatedComment);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;