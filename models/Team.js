const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  hackathonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hackathon' }
});

module.exports = mongoose.model('Team', teamSchema);