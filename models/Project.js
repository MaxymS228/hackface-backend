const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  name: { type: String, required: true },
  description: String,
  githubLink: String,
  submissionDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Project', projectSchema);