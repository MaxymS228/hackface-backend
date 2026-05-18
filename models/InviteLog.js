// Якщо хтось відхилив запрошення його додає сюди
const mongoose = require('mongoose');

const inviteLogSchema = new mongoose.Schema({
  hackathonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hackathon', required: true },
  email: { type: String, required: true },
  role: { type: String, required: true },
  invitedBy: { type: String },
  status: { type: String, enum: ['Rejected'], default: 'Rejected' },
  rejectedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InviteLog', inviteLogSchema);