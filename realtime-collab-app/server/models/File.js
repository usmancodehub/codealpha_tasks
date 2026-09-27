const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
  fileName: { 
    type: String, 
    required: true 
  },
  fileUrl: { 
    type: String, 
    required: true 
  },
  fileSize: { 
    type: Number, 
    required: true 
  },
  mimeType: { 
    type: String, 
    required: true 
  },
  roomId: { 
    type: String, 
    required: true,
    index: true 
  },
  uploadedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  uploaderName: {
    type: String,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('File', FileSchema);