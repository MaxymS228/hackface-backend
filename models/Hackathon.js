const mongoose = require('mongoose');

const hackathonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  banner: { type: String, default: '' }, // Посилання на картинку-заставку
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  registrationDeadline: { type: Date }, // Коли закінчується прийом заявок
  format: { type: String, enum: ['Online', 'Offline', 'Hybrid'], default: 'Online' },
  location: { type: String, default: '' }, // Місто/місце (якщо офлайн/гібрид)
  themes: { type: [String], default: [] }, // Наприклад: ['Web3', 'AI', 'FinTech']
  prizes: { type: String, default: '' }, // Опис призів або сума
  status: { type: String, enum: ['Upcoming', 'Ongoing', 'Finished'], default: 'Upcoming' },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Список учасників
  views: { type: Number, default: 0 }, // Кількість переглядів
  createdAt: { type: Date, default: Date.now },
  minTeamSize: { type: Number, default: 1 },
  maxTeamSize: { type: Number, default: 5 },
  allowSolo: { type: Boolean, default: true }
});

module.exports = mongoose.model('Hackathon', hackathonSchema);