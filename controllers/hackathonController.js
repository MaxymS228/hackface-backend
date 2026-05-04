const Hackathon = require('../models/Hackathon');
const cloudinary = require('cloudinary').v2; 

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

    await newHackathon.save();

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
    if (location !== undefined) hackathon.location = location; // може бути порожнім, якщо змінили на Online
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
      // 1. Видаляємо старий з Cloudinary
      await deleteOldImageFromCloudinary(hackathon.banner);
      // 2. Зберігаємо новий URL
      hackathon.banner = req.file.path;
    }

    await hackathon.save();

    res.json({ message: 'Хакатон успішно оновлено', hackathon });
  } catch (error) {
    console.error('Помилка оновлення хакатону:', error);
    res.status(500).json({ message: 'Помилка сервера при оновленні хакатону' });
  }
};



// const Hackathon = require('../models/Hackathon');

// exports.createHackathon = async (req, res) => {
//   try {
//     const { 
//       title, 
//       description, 
//       startDate, 
//       endDate, 
//       registrationDeadline,
//       format,
//       location,
//       themes,
//       prizes 
//     } = req.body;

//     // Створюємо об'єкт хакатону, відразу прив'язуючи його до творця
//     const newHackathon = new Hackathon({
//       title,
//       description,
//       startDate,
//       endDate,
//       registrationDeadline,
//       format,
//       location,
//       prizes,
//       organizerId: req.userId // Беремо ID з токена авторизації
//     });

//     // Обробка тегів (якщо прийшли строкою "AI, Web3")
//     if (themes) {
//       newHackathon.themes = themes.split(',').map(theme => theme.trim()).filter(t => t);
//     }

//     // Обробка картинки-заставки
//     // if (req.file) {
//     //   const baseUrl = `${req.protocol}://${req.get('host')}`;
//     //   newHackathon.banner = `${baseUrl}/uploads/${req.file.filename}`;
//     // }
//     if (req.file) {
//       newHackathon.banner = req.file.path; 
//     }

//     await newHackathon.save();

//     res.status(201).json({ 
//       message: 'Хакатон успішно створено!', 
//       hackathon: newHackathon 
//     });

//   } catch (error) {
//     console.error('Помилка створення хакатону:', error);
//     res.status(500).json({ message: 'Помилка сервера при створенні хакатону' });
//   }
// };

// exports.getMyHackathons = async (req, res) => {
//   try {
//     // Шукаємо хакатони, де organizerId співпадає з ID користувача з токена
//     const hacks = await Hackathon.find({ organizerId: req.userId }).sort({ createdAt: -1 });
    
//     res.status(200).json(hacks);
//   } catch (error) {
//     console.error('Помилка отримання хакатонів:', error);
//     res.status(500).json({ message: 'Помилка сервера при завантаженні хакатонів' });
//   }
// };




// // const Hackathon = require('../models/Hackathon');

// // const createHackathon = async (req, res) => {
// //   const { name, description, startDate, endDate, organizerId } = req.body;

// //   if (!organizerId) {
// //     return res.status(401).json({ message: 'Організатор не авторизований' });
// //   }

// //   try {
// //     const newHackathon = new Hackathon({
// //       name,
// //       description,
// //       startDate,
// //       endDate,
// //       organizer: organizerId
// //     });

// //     await newHackathon.save();
// //     res.status(201).json({ message: 'Хакатон успішно створено!' });
// //   } catch (error) {
// //     console.error('Помилка створення хакатону:', error);
// //     res.status(500).json({ message: 'Помилка сервера' });
// //   }
// // };

// // const getHackathonsByOrganizer = async (req, res) => {
// //   const { organizerId } = req.query;

// //   try {
// //     const hacks = await Hackathon.find({ organizer: organizerId }).sort({ createdAt: -1 });
// //     res.json(hacks);
// //   } catch (error) {
// //     console.error('Помилка отримання хакатонів:', error);
// //     res.status(500).json({ message: 'Помилка сервера' });
// //   }
// // };

// // module.exports = {
// //   createHackathon,
// //   getHackathonsByOrganizer
// // };


