const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

require('events').EventEmitter.defaultMaxListeners = 20;

// Middleware
app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/authRoutes');
app.use('/api', authRoutes); 
const projectRoutes = require('./routes/projectRoutes');
app.use('/api', projectRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const hackathonRoutes = require('./routes/hackathonRoutes');
app.use('/api', hackathonRoutes);
const teamRoutes = require('./routes/teamRoutes');
app.use('/api', teamRoutes);
const dashboardRoutes = require('./routes/dashboardRoutes');
app.use('/api/dashboard', dashboardRoutes);
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);


// Routes
app.get('/', (req, res) => {
  res.send('Hackathon Face API працює!');
});

// Підключення до MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('+ Підключено до MongoDB'))
.catch(err => console.error('- Помилка MongoDB:', err));

// Запуск сервера
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Сервер запущено на порту ${PORT}`);
});
