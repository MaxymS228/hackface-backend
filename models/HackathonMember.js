const mongoose = require('mongoose');

const hackathonMemberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  hackathonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hackathon', required: true },
  role: { 
    type: String, 
    enum: ['Organizer', 'Jury', 'Mentor', 'Participant'], 
    required: true 
  },
  joinDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('HackathonMember', hackathonMemberSchema);