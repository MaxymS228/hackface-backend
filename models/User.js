const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  registrationDate: { type: Date, default: Date.now },
  status: { type: String, default: 'Pending' },
  verificationToken: { type: String },
  specialization: { type: String, default: '' }, // Наприклад: Frontend, Backend, UI/UX
  bio: { type: String, default: '' },            // Коротко про себе
  skills: { type: [String], default: [] },       // Масив навичок: ['React', 'Node.js', 'Figma']
  githubLink: { type: String, default: '' },     // Посилання на GitHub або портфоліо
  avatar: { type: String, default: '' },
  banner: { type: String, default: '' },
  authProvider: { type: String, default: 'local' }
});

module.exports = mongoose.model('User', userSchema);