const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Хто оцінює (Суддя)
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  innovationScore: Number,
  technicalScore: Number,
  presentationScore: Number,
  comment: String
});

module.exports = mongoose.model('Assessment', assessmentSchema);