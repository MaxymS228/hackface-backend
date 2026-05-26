const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const User = require('./models/User');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Налаштування Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

require('events').EventEmitter.defaultMaxListeners = 20;

// Middleware
app.use(cors());
app.use(express.json());

//Добре
const authRoutes = require('./routes/authRoutes');
app.use('/api', authRoutes); 

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

//Добре
const chatRoutes = require('./routes/chatRoutes');
app.use('/api/chat', chatRoutes);

//Добре
const submissionRoutes = require('./routes/submissionRoutes');
app.use('/api/submissions', submissionRoutes);

//Добре
const assessmentRoutes = require('./routes/assessmentRoutes');
app.use('/api/assessments', assessmentRoutes);

//Добре
const taskRoutes = require('./routes/taskRoutes');
app.use('/api/tasks', taskRoutes);

// Routes
app.get('/', (req, res) => {
  res.send('Hackathon Face API працює!');
});

const Message = require('./models/Message');
const jwt = require('jsonwebtoken');

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error('Не авторизовано'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key');
    socket.userId = decoded.id;

    const user = await User.findById(decoded.id).select('name');
    socket.userName = user?.name || 'Учасник';
    next();
  } catch {
    next(new Error('Недійсний токен'));
  }
});

io.on('connection', (socket) => {
  console.log(`Користувач підключився: ${socket.userId}`);

  // Приєднання до кімнати команди
  socket.on('join_team', (teamId) => {
    socket.join(`team_${teamId}`);
    console.log(`${socket.userId} приєднався до team_${teamId}`);
  });

  // Приєднання до загального чату хакатону
  socket.on('join_hackathon', (hackathonId) => {
    socket.join(`hackathon_${hackathonId}`);
  });

  // Нове повідомлення в командний чат
  socket.on('send_team_message', async ({ teamId, hackathonId, text }) => {
    if (!text?.trim()) return;
    try {
      const message = new Message({
        teamId,
        hackathonId,
        senderId: socket.userId,
        senderName: socket.userName || 'Учасник',
        text: text.trim()
      });
      await message.save();

      io.to(`team_${teamId}`).emit('new_team_message', {
        _id: message._id,
        senderId: socket.userId,
        senderName: message.senderName,
        text: message.text,
        createdAt: message.createdAt
      });
    } catch (err) {
      console.error('Помилка збереження повідомлення:', err);
    }
  });

  // Нове повідомлення в загальний чат хакатону
  socket.on('send_hackathon_message', async ({ hackathonId, text }) => {
    if (!text?.trim()) return;
    try {
      const message = new Message({
        teamId: null,
        hackathonId,
        senderId: socket.userId,
        senderName: socket.userName || 'Учасник',
        text: text.trim()
      });
      await message.save();

      io.to(`hackathon_${hackathonId}`).emit('new_hackathon_message', {
        _id: message._id,
        senderId: socket.userId,
        senderName: message.senderName,
        text: message.text,
        createdAt: message.createdAt
      });
    } catch (err) {
      console.error('Помилка збереження повідомлення:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`Користувач відключився: ${socket.userId}`);
  });
});

// Підключення до MongoDB
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log('+ Підключено до MongoDB'))
.catch(err => console.error('- Помилка MongoDB:', err));

// Запуск сервера
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Сервер запущено на порту ${PORT}`);
});
