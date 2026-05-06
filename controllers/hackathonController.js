const Hackathon = require('../models/Hackathon');
const HackathonMember = require('../models/HackathonMember');
const User = require('../models/User');
const nodemailer = require('nodemailer');
const cloudinary = require('cloudinary').v2; 

// Налаштовування transporter для відправки листів
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Допоміжна функція для видалення файлу з Cloudinary
const deleteOldImageFromCloudinary = async (imageUrl) => {
  if (!imageUrl || !imageUrl.includes('cloudinary.com')) return;
  
  try {
    const publicId = imageUrl.substring(
      imageUrl.indexOf('uploads/'), 
      imageUrl.lastIndexOf('.')
    );
    
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
      console.log(`Старий банер хакатону успішно видалено: ${publicId}`);
    }
  } catch (err) {
    console.error('Помилка при видаленні старого банера з Cloudinary:', err);
  }
};

// 1. Створення хакатону
exports.createHackathon = async (req, res) => {
  try {
    const { 
      title, description, startDate, endDate, registrationDeadline,
      format, location, themes, prizes 
    } = req.body;

    const newHackathon = new Hackathon({
      title, description, startDate, endDate, registrationDeadline,
      format, location, prizes,
      organizerId: req.userId 
    });

    if (themes) {
      newHackathon.themes = themes.split(',').map(theme => theme.trim()).filter(t => t);
    }

    if (req.file) {
      newHackathon.banner = req.file.path;
    }

    // Зберігаємо сам хакатон у базу
    await newHackathon.save();

    // Створюємо запис у HackathonMember, що цей користувач є організатором
    const newMember = new HackathonMember({
      userId: req.userId,
      hackathonId: newHackathon._id,
      role: 'Organizer'
    });
    
    await newMember.save();

    res.status(201).json({ 
      message: 'Хакатон успішно створено!', 
      hackathon: newHackathon 
    });

  } catch (error) {
    console.error('Помилка створення хакатону:', error);
    res.status(500).json({ message: 'Помилка сервера при створенні хакатону' });
  }
};

// 2. Отримання хакатонів, створених поточним користувачем (для Дашборда)
exports.getMyHackathons = async (req, res) => {
  try {
    const hacks = await Hackathon.find({ organizerId: req.userId }).sort({ createdAt: -1 });
    res.status(200).json(hacks);
  } catch (error) {
    console.error('Помилка отримання хакатонів:', error);
    res.status(500).json({ message: 'Помилка сервера при завантаженні хакатонів' });
  }
};

// 3. Оновлення хакатону (з видаленням старого банера)
exports.updateHackathon = async (req, res) => {
  try {
    const { id } = req.params; // ID хакатону з URL
    const { 
      title, description, startDate, endDate, registrationDeadline,
      format, location, themes, prizes, status 
    } = req.body;

    // Шукаємо хакатон
    const hackathon = await Hackathon.findById(id);
    
    if (!hackathon) {
      return res.status(404).json({ message: 'Хакатон не знайдено' });
    }

    // Перевіряємо, чи користувач є організатором цього хакатону
    if (hackathon.organizerId.toString() !== req.userId) {
      return res.status(403).json({ message: 'У вас немає прав для редагування цього хакатону' });
    }

    // Оновлюємо текстові поля
    if (title) hackathon.title = title;
    if (description) hackathon.description = description;
    if (startDate) hackathon.startDate = startDate;
    if (endDate) hackathon.endDate = endDate;
    if (registrationDeadline) hackathon.registrationDeadline = registrationDeadline;
    if (format) hackathon.format = format;
    if (hackathon.format === 'Online') { hackathon.location = ''; } else if (location !== undefined) { hackathon.location = location; }
    if (prizes !== undefined) hackathon.prizes = prizes;
    if (status) hackathon.status = status;

    if (themes !== undefined) {
      if (typeof themes === 'string') {
        hackathon.themes = themes.split(',').map(theme => theme.trim()).filter(t => t);
      } else if (Array.isArray(themes)) {
        hackathon.themes = themes;
      }
    }

    if (req.file) {
      // Видаляємо старий з Cloudinary
      await deleteOldImageFromCloudinary(hackathon.banner);
      // Зберігаємо новий URL
      hackathon.banner = req.file.path;
    }

    await hackathon.save();

    res.json({ message: 'Хакатон успішно оновлено', hackathon });
  } catch (error) {
    console.error('Помилка оновлення хакатону:', error);
    res.status(500).json({ message: 'Помилка сервера при оновленні хакатону' });
  }
};

// 4. Отримання одного хакатону за ID (з підтягуванням команди)
exports.getHackathonById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Шукаємо хакатон (.lean() робить його звичайним JS об'єктом, щоб легко додати нові поля)
    const hackathon = await Hackathon.findById(id).lean();

    if (!hackathon) {
      return res.status(404).json({ message: 'Хакатон не знайдено' });
    }

    // Шукаємо всіх учасників
    const teamMembers = await HackathonMember.find({
      hackathonId: id
    }).populate('userId', 'name email avatarUrl specialization ');

    // Форматуємо дані під наш фронтенд дизайн
    const members = teamMembers.map(member => ({
      _id: member._id,
      role: member.role,
      joinedAt: member.joinDate,
      user: {
        _id: member.userId._id,
        name: member.userId.name,
        email: member.userId.email,
        avatarUrl: member.userId.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.userId.name)}&background=6366f1&color=fff&size=128`
      }
    }));

    // Відправляємо хакатон, прикріпивши до нього масив members
    res.status(200).json({ ...hackathon, members });

  } catch (error) {
    console.error('Помилка отримання хакатону:', error);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Хакатон не знайдено' });
    }
    
    res.status(500).json({ message: 'Помилка сервера при завантаженні хакатону' });
  }
};

// 5. Приєднання до хакатону (POST /api/hackathons/:id/join)
exports.joinHackathon = async (req, res) => {
  try {
    const { id } = req.params; // ID хакатону
    const userId = req.userId; // ID користувача з токена

    // Перевіряємо, чи існує хакатон
    const hackathon = await Hackathon.findById(id);
    if (!hackathon) {
      return res.status(404).json({ message: 'Хакатон не знайдено' });
    }

    // Перевіряємо, чи не закінчилась реєстрація
    if (new Date() > new Date(hackathon.registrationDeadline)) {
      return res.status(400).json({ message: 'Реєстрацію на цей хакатон вже закрито' });
    }

    // Перевіряємо, чи користувач вже є учасником або організатором
    const existingMember = await HackathonMember.findOne({
      hackathonId: id,
      userId: userId
    });

    if (existingMember) {
      return res.status(400).json({ message: 'Ви вже берете участь у цьому хакатоні' });
    }

    // Створюємо запис учасника
    const newParticipant = new HackathonMember({
      userId: userId,
      hackathonId: id,
      role: 'Participant' 
    });

    await newParticipant.save();

    // Відправка повідомлення на пошту
    const user = await User.findById(userId);
    
    if (user && user.email) {
      const startDate = new Date(hackathon.startDate).toLocaleDateString('uk-UA');
      const endDate = new Date(hackathon.endDate).toLocaleDateString('uk-UA');

      const mailOptions = {
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: `Успішна реєстрація на хакатон: ${hackathon.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #4f46e5;">Вітаємо, ${user.name || 'учаснику'}! 🎉</h2>
            <p>Дякуємо Вам, що приєдналися до нашого хакатону <strong>"${hackathon.title}"</strong>.</p>
            <p>Ми раді бачити вас серед учасників. Це чудова можливість проявити свої навички, створити крутий проєкт та поборотися за призи!</p>
            
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
              <p style="margin: 0 0 10px 0;"><strong>📅 Дати проведення:</strong> з ${startDate} по ${endDate}</p>
              <p style="margin: 0 0 10px 0;"><strong>📍 Формат:</strong> ${hackathon.format === 'Online' ? 'Онлайн' : hackathon.location}</p>
            </div>

            <p>Ближче до початку ми надішлемо додаткову інформацію щодо формування команд та подальших кроків.</p>
            <p>Бажаємо успіхів та натхнення!</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #64748b; font-size: 14px;">З повагою,<br>Команда Hackathon Face</p>
          </div>
        `
      };

      try {
        await transporter.sendMail(mailOptions);
        console.log(`Лист про реєстрацію відправлено на ${user.email}`);
      } catch (emailError) {
        console.error('Помилка відправки листа, але користувача зареєстровано:', emailError);
      }
    }

    res.status(200).json({ message: 'Ви успішно приєдналися до хакатону!' });

  } catch (error) {
    console.error('Помилка приєднання до хакатону:', error);
    res.status(500).json({ message: 'Помилка сервера при приєднанні' });
  }
};

// 6. Вихід з хакатону (DELETE /api/hackathons/:id/leave)
exports.leaveHackathon = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // Шукаємо і видаляємо запис учасника (перевіряємо, щоб це був саме Participant)
    const deletedMember = await HackathonMember.findOneAndDelete({
      hackathonId: id,
      userId: userId,
      role: 'Participant'
    });

    if (!deletedMember) {
      return res.status(400).json({ message: 'Ви не є учасником цього хакатону або не маєте прав для виходу' });
    }

    res.status(200).json({ message: 'Ви успішно скасували свою участь у хакатоні' });

  } catch (error) {
    console.error('Помилка виходу з хакатону:', error);
    res.status(500).json({ message: 'Помилка сервера при скасуванні участі' });
  }
};

// 7. Видалення учасника організатором
exports.removeParticipant = async (req, res) => {
  try {
    const { id, userId } = req.params;

    // Знаходимо і видаляємо запис з HackathonMember
    const deletedMember = await HackathonMember.findOneAndDelete({
      hackathonId: id,
      userId: userId
    });

    if (!deletedMember) {
      return res.status(404).json({ message: 'Учасника не знайдено на цьому хакатоні' });
    }

    res.status(200).json({ message: 'Учасника успішно видалено' });
  } catch (error) {
    console.error('Помилка видалення учасника:', error);
    res.status(500).json({ message: 'Помилка сервера при видаленні учасника' });
  }
};