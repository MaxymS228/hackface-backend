const mongoose = require('mongoose');

const hackathonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  startDate: Date,
  endDate: Date,
  status: { type: String, enum: ['Upcoming', 'Ongoing', 'Finished'], default: 'Upcoming' },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // Хто створив
});

module.exports = mongoose.model('Hackathon', hackathonSchema);