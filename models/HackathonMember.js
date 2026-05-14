const mongoose = require('mongoose');

const hackathonMemberSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  hackathonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hackathon', required: true },
  email: { type: String, required: false },
  role: { 
    type: String, 
    enum: ['Organizer', 'Jury', 'Mentor', 'Participant', 'Co-organizer'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['Pending', 'Accepted', 'Rejected'], 
    default: 'Accepted'
  },
  joinDate: { type: Date, default: Date.now }
});

module.exports = mongoose.model('HackathonMember', hackathonMemberSchema);