const mongoose = require('mongoose');

const teamMemberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' },
  role: { type: String, enum: ['Captain', 'Developer', 'Designer', 'Other'] }
});

module.exports = mongoose.model('TeamMember', teamMemberSchema);