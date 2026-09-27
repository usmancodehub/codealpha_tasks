const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const File = require('../models/File');
const auth = require('../middleware/auth');

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter (limit to reasonable types - optional)
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('File type not allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

// @route   POST /api/files/upload
// @desc    Upload a file to a specific room
// @access  Private
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ msg: 'No file uploaded' });
    }

    const { roomId, uploaderName } = req.body;

    if (!roomId) {
      // Delete the file if roomId missing
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ msg: 'Room ID is required' });
    }

    const newFile = new File({
      fileName: req.file.originalname,
      fileUrl: `/uploads/${req.file.filename}`,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      roomId,
      uploadedBy: req.user.id,
      uploaderName: uploaderName || 'Anonymous'
    });

    await newFile.save();

    res.json({
      msg: 'File uploaded successfully',
      file: {
        id: newFile._id,
        fileName: newFile.fileName,
        fileUrl: newFile.fileUrl,
        fileSize: newFile.fileSize,
        uploaderName: newFile.uploaderName,
        uploadedAt: newFile.createdAt
      }
    });
  } catch (err) {
    console.error('Upload error:', err.message);
    res.status(500).json({ msg: 'Server error during upload' });
  }
});

// @route   GET /api/files/:roomId
// @desc    Get all files for a specific room
// @access  Private
router.get('/:roomId', auth, async (req, res) => {
  try {
    const files = await File.find({ roomId: req.params.roomId })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json(files);
  } catch (err) {
    console.error('Fetch files error:', err.message);
    res.status(500).json({ msg: 'Server error fetching files' });
  }
});

// @route   DELETE /api/files/:id
// @desc    Delete a file (only uploader or admin)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).json({ msg: 'File not found' });
    }

    if (file.uploadedBy.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to delete this file' });
    }

    // Remove from disk
    const filePath = path.join(uploadDir, path.basename(file.fileUrl));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await file.deleteOne();
    res.json({ msg: 'File deleted successfully' });
  } catch (err) {
    console.error('Delete error:', err.message);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;