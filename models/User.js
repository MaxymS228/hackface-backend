const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  registrationDate: { type: Date, default: Date.now },
  status: { type: String, default: 'Pending' },
  verificationToken: { type: String }
});

module.exports = mongoose.model('User', userSchema);