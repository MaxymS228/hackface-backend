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
  joinDate: { type: Date, default: Date.now },
  invitedBy: { type: String, default: '' },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  teamRole: { type: String, enum: ['Captain', 'Member', null], default: null },
  primaryRole: {
    type: String,
    enum: ['Frontend', 'Backend', 'Design', 'ML', 'Mobile', 'DevOps', 'Other', null],
    default: null
  },
});

module.exports = mongoose.model('HackathonMember', hackathonMemberSchema);