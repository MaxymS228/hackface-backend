const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  hackathonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hackathon', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  stage: { type: Number, enum: [1, 2, 3], required: true },
  criteria: [{
    name: { type: String, required: true },
    maxScore: { type: Number, required: true, min: 1, max: 100 }
  }],
  opensAt: { type: Date },
  closesAt: { type: Date },
  isVisible: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', taskSchema);