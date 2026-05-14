const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async (req, res, next) => {
  const authHeader = req.header('Authorization');
  
  if (!authHeader) {
    return res.status(401).json({ message: 'Доступ заборонено. Немає токена авторизації.' });
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Токен відсутній або має неправильний формат.' });
  }

  try {
    const secretKey = process.env.JWT_SECRET || 'super_secret_key_123123_hackface_228'; 
    
    const decoded = jwt.verify(token, secretKey);
    
    req.userId = decoded.id; 

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'Користувача не знайдено.' });
    }

    req.user = user;
    
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Недійсний або прострочений токен.' });
  }
};