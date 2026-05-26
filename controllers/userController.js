const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
//const fs = require('fs');
//const path = require('path');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const HackathonMember = require('../models/HackathonMember');
const TaskScore = require('../models/TaskScore');
const Team = require('../models/Team');
const Project = require('../models/Project');

// Допоміжна функція для видалення файлів з Cloudinary
const deleteOldImageFromCloudinary = async (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('cloudinary.com')) return;
  
  try {
    const publicId = imageUrl.substring(
      imageUrl.indexOf('uploads/'), 
      imageUrl.lastIndexOf('.')
    );
    
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
      console.log(`Старий файл успішно видалено з Cloudinary: ${publicId}`);
    }
  } catch (err) {
    console.error('Помилка при видаленні старого файлу з Cloudinary:', err);
  }
};

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

    if (req.files) {
      if (req.files.avatar) {
        // Видаляємо стару аватарку перед збереженням нової
        await deleteOldImageFromCloudinary(user.avatar);
        // Зберігаємо нове посилання, яке нам повернув Cloudinary через Multer
        user.avatar = req.files.avatar[0].path; 
      }
      if (req.files.banner) {
        // Видаляємо старий банер
        await deleteOldImageFromCloudinary(user.banner);
        user.banner = req.files.banner[0].path;
      }
    }
    // const deleteOldImage = (imageUrl) => {
    //   if (!imageUrl) return;
      
    //   try {
    //     const filename = imageUrl.split('/uploads/')[1]; 
        
    //     if (filename) {
    //       const filePath = path.join(__dirname, '../uploads', filename);
          
    //       if (fs.existsSync(filePath)) {
    //         fs.unlinkSync(filePath);
    //         console.log(`Старий файл видалено: ${filename}`);
    //       }
    //     }
    //   } catch (err) {
    //     console.error('Помилка при видаленні старого файлу:', err);
    //   }
    // };

    // const baseUrl = `${req.protocol}://${req.get('host')}`;

    // if (req.files) {
    //   if (req.files.avatar) {
    //     deleteOldImage(user.avatar);
    //     user.avatar = `${baseUrl}/uploads/${req.files.avatar[0].filename}`;
    //   }
    //   if (req.files.banner) {
    //     deleteOldImage(user.banner);
    //     user.banner = `${baseUrl}/uploads/${req.files.banner[0].filename}`;
    //   }
    // }

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

// 5. Отрмання статистики профілю
exports.getUserStats = async (req, res) => {
  try {
    const { id } = req.params;

    // Всі участі у хакатонах
    const memberships = await HackathonMember.find({
      userId: id, role: 'Participant', status: 'Accepted'
    }).populate('hackathonId', 'title startDate endDate');

    const hackathonIds = memberships.map(m => m.hackathonId?._id).filter(Boolean);

    // Команди де юзер є учасником
    const teamMemberships = await HackathonMember.find({
      userId: id, teamId: { $ne: null }, status: 'Accepted'
    }).populate('teamId');

    const teamIds = teamMemberships.map(m => m.teamId?._id).filter(Boolean);

    // Рахуємо місця — для кожного завершеного хакатону
    let place1 = 0, place2 = 0, place3 = 0;
    const completedHackathons = [];

    for (const membership of memberships) {
      const hack = membership.hackathonId;
      if (!hack || new Date() < new Date(hack.endDate)) continue;

      const res2 = await fetch(`${process.env.FRONTEND_URL || 'http://localhost:5000'}/api/tasks/hackathon/${hack._id}/results`).catch(() => null);

      const Task = require('../models/Task');
      const tasks = await Task.find({ hackathonId: hack._id, isVisible: true });
      const allScores = await TaskScore.find({ hackathonId: hack._id });
      const teams = await Team.find({ hackathonId: hack._id });

      const tableData = teams.map(team => {
        const total = tasks.reduce((sum, task) => {
          const scores = allScores.filter(
            s => s.taskId.toString() === task._id.toString() &&
                 s.teamId.toString() === team._id.toString()
          );
          if (scores.length === 0) return sum;
          const avg = scores.reduce((s2, sc) => s2 + sc.totalScore, 0) / scores.length;
          return sum + avg;
        }, 0);
        return { teamId: team._id.toString(), total: Math.round(total * 10) / 10 };
      }).sort((a, b) => b.total - a.total);

      // Шукаємо чи є юзер в якійсь команді цього хакатону
      const userTeam = teamMemberships.find(tm =>
        tm.hackathonId?.toString() === hack._id.toString() ||
        teams.some(t => t._id.toString() === tm.teamId?._id?.toString() && t.hackathonId.toString() === hack._id.toString())
      );

      if (userTeam?.teamId) {
        const rank = tableData.findIndex(t => t.teamId === userTeam.teamId._id?.toString()) + 1;
        if (rank === 1) place1++;
        else if (rank === 2) place2++;
        else if (rank === 3) place3++;
      }

      completedHackathons.push({
        _id: hack._id,
        title: hack.title,
        startDate: hack.startDate,
        endDate: hack.endDate,
      });
    }

    // Проєкти команд юзера
    const projects = await Project.find({ teamId: { $in: teamIds } })
      .populate('teamId', 'name hackathonId');

    res.status(200).json({
      totalHackathons: memberships.length,
      completedHackathons,
      podium: { place1, place2, place3, total: place1 + place2 + place3 },
      projects,
    });
  } catch (error) {
    console.error('Помилка stats:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};