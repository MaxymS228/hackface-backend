const mongoose = require('mongoose');

const taskScoreSchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  hackathonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hackathon', required: true },
  juryId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scores: [{ criterionName: String, score: Number }],
  comment: { type: String, default: '' },
  totalScore: { type: Number, default: 0 },
  submittedAt: { type: Date, default: Date.now }
});

// Один журі — одна оцінка команди за завдання
taskScoreSchema.index({ taskId: 1, teamId: 1, juryId: 1 }, { unique: true });

module.exports = mongoose.model('TaskScore', taskScoreSchema);