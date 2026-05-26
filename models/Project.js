const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true, unique: true },
  hackathonId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hackathon', required: true },
  title: { type: String, required: true }, // Назва проекту (може відрізнятися від назви команди)
  description: { type: String, required: true }, // Опис
  repoUrl: { type: String }, // Посилання на GitHub/GitLab
  demoUrl: { type: String }, // Посилання на задеплоєний проект (Vercel, Netlify тощо)
  presentationUrl: { type: String }, // Посилання на презентацію (Figma, Google Slides)
  videoUrl: { type: String }, // YouTube/Loom пітч
  submittedAt: { type: Date, default: Date.now }, // Час першої здачі
  lastUpdatedAt: { type: Date, default: Date.now }, // Час останнього редагування
  assignedJury: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }] // Призначені суді
});

module.exports = mongoose.model('Project', projectSchema);