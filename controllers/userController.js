const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const User = require('../models/User');

// 1. Отримання власних даних (для сторінки Налаштувань)
exports.getCurrentUser = async (req, res) => {
  try {
    // req.userId має передаватися з вашого middleware авторизації (JWT)
    // .select('-password') означає "віддай все, КРІМ пароля"
    //console.log("ID з токена:", req.userId);
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Користувача не знайдено' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Помилка getCurrentUser:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 2. Оновлення власного профілю (Збереження Налаштувань)
exports.updateProfile = async (req, res) => {
  try {
    const { name, specialization, bio, skills, githubLink } = req.body;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'Користувача не знайдено' });
    }

    // Оновлюємо поля, якщо вони були передані у запиті
    if (name) user.name = name;
    if (specialization !== undefined) user.specialization = specialization;
    if (bio !== undefined) user.bio = bio;
    if (githubLink !== undefined) user.githubLink = githubLink;
    
    // Обробка масиву навичок (skills)
    if (skills !== undefined) {
      // Якщо з фронтенду прийшов рядок через кому, робимо з нього масив
      if (typeof skills === 'string') {
        user.skills = skills.split(',').map(skill => skill.trim()).filter(skill => skill);
      } else if (Array.isArray(skills)) {
        user.skills = skills;
      }
    }

    const deleteOldImage = (imageUrl) => {
      if (!imageUrl) return;
      
      try {
        const filename = imageUrl.split('/uploads/')[1]; 
        
        if (filename) {
          const filePath = path.join(__dirname, '../uploads', filename);
          
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Старий файл видалено: ${filename}`);
          }
        }
      } catch (err) {
        console.error('Помилка при видаленні старого файлу:', err);
      }
    };

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    if (req.files) {
      if (req.files.avatar) {
        deleteOldImage(user.avatar);
        user.avatar = `${baseUrl}/uploads/${req.files.avatar[0].filename}`;
      }
      if (req.files.banner) {
        deleteOldImage(user.banner);
        user.banner = `${baseUrl}/uploads/${req.files.banner[0].filename}`;
      }
    }

    await user.save();

    // Повертаємо оновлені дані (без пароля)
    const updatedUser = await User.findById(req.userId).select('-password');
    res.json({ message: 'Профіль успішно оновлено', user: updatedUser });

  } catch (error) {
    console.error('Помилка updateProfile:', error);
    res.status(500).json({ message: 'Помилка при оновленні профілю' });
  }
};

// 3. Публічний профіль іншого користувача (для сторінки Візитки)
exports.getPublicProfile = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Неправильний формат ідентифікатора користувача' });
    }

    const user = await User.findById(id)
      .select('name specialization bio skills githubLink registrationDate status avatar banner');

    if (!user) {
      return res.status(404).json({ message: 'Користувача не знайдено' });
    }

    res.json(user);
  } catch (error) {
    console.error('Помилка getPublicProfile:', error);
    res.status(500).json({ message: 'Помилка сервера при завантаженні профілю.' });
  }
};

// 4. Зміна паролю користувача
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: 'Користувача не знайдено' });
    }

    // Якщо це Google-юзер, блокуємо запит на бекенді
    if (user.authProvider === 'google') {
      return res.status(400).json({ message: 'Користувачі Google не можуть змінювати пароль у цьому додатку.' });
    }

    // Перевіряємо, чи співпадає поточний (старий) пароль
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Невірний поточний пароль' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    
    await user.save();

    res.json({ message: 'Пароль успішно змінено!' });
  } catch (error) {
    console.error('Помилка changePassword:', error);
    res.status(500).json({ message: 'Помилка сервера при зміні пароля' });
  }
};