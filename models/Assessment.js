const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  hackathonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hackathon', required: true },
  innovationScore: { type: Number, min: 0, max: 10, default: 0 },
  technicalScore: { type: Number, min: 0, max: 10, default: 0 },
  presentationScore: { type: Number, min: 0, max: 10, default: 0 },
  comment: { type: String, default: '' },
  submittedAt: { type: Date, default: Date.now },
  isCompleted: { type: Boolean, default: false }
});

// Один суддя — одна оцінка для проєкту
assessmentSchema.index({ userId: 1, projectId: 1 }, { unique: true });

module.exports = mongoose.model('Assessment', assessmentSchema);