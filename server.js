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

//Добре
const authRoutes = require('./routes/authRoutes');
app.use('/api', authRoutes); 

const projectRoutes = require('./routes/projectRoutes');
app.use('/api', projectRoutes);

//Добре
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

//Добре
const hackathonRoutes = require('./routes/hackathonRoutes');
app.use('/api/hackathons', hackathonRoutes);

//Добре
const teamRoutes = require('./routes/teamRoutes');
app.use('/api/teams', teamRoutes);

//Добре
const dashboardRoutes = require('./routes/dashboardRoutes');
app.use('/api/dashboard', dashboardRoutes);

//Добре
const userRoutes = require('./routes/userRoutes');
app.use('/api/users', userRoutes);

// Routes
app.get('/', (req, res) => {
  res.send('Hackathon Face API працює!');
});

// Підключення до MongoDB
// mongoose.connect(process.env.MONGO_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('+ Підключено до MongoDB'))
.catch(err => console.error('- Помилка MongoDB:', err));

// Запуск сервера
const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущено на порту ${PORT}`);
});
