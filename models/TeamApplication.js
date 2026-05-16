const mongoose = require('mongoose');

const teamApplicationSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  applicantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hackathonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hackathon', required: true },
  coverLetter: { type: String, default: '' },
  primaryRole: {
    type: String,
    enum: ['Frontend', 'Backend', 'Design', 'ML', 'Mobile', 'DevOps', 'Other'],
    default: 'Other'
  },
  status: {
    type: String,
    enum: ['Pending', 'Accepted', 'Rejected'],
    default: 'Pending'
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TeamApplication', teamApplicationSchema);