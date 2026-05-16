const Hackathon = require('../models/Hackathon');
const HackathonMember = require('../models/HackathonMember');
const Team = require('../models/Team');
const User = require('../models/User');
//const nodemailer = require('nodemailer');
const cloudinary = require('cloudinary').v2; 
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

// // Налаштовування transporter для відправки листів
// const transporter = nodemailer.createTransport({
//   service: 'smtp.gmail.com',
//   port: 587, 
//   secure: false,
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
//   connectionTimeout: 10000,
//   greetingTimeout: 10000,
//   socketTimeout: 10000,
// });

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
      role: 'Organizer', 
      status: "Accepted"
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

// 2. Отримання хакатонів, де присутній поточний користувач (для Дашборда)
exports.getMyHackathons = async (req, res) => {
  try {
    const userId = req.userId;

    // Отримуємо хакатони, які користувач створив сам
    const organizedHacks = await Hackathon.find({ organizerId: userId }).lean();

    // Отримуємо хакатони, до яких користувач ПРИЄДНАВСЯ (як Participant, Mentor, Jury, Co-organizer)
    const memberships = await HackathonMember.find({ 
      userId: userId,
      status: 'Accepted'
    }).populate('hackathonId').lean();

    const hackathonsMap = new Map();

    organizedHacks.forEach(hack => {
      hackathonsMap.set(hack._id.toString(), {
        ...hack,
        userRole: 'Organizer'
      });
    });

    // Додаємо хакатони, де користувач є учасником/персоналом
    memberships.forEach(member => {
      if (member.hackathonId) {
        const hackId = member.hackathonId._id.toString();
        if (!hackathonsMap.has(hackId)) {
          hackathonsMap.set(hackId, {
            ...member.hackathonId,
            userRole: member.role 
          });
        }
      }
    });

    // Перетворюємо Map назад у масив і сортуємо за датою (від новіших до старіших)
    const allMyHackathons = Array.from(hackathonsMap.values()).sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.status(200).json(allMyHackathons);
  } catch (error) {
    console.error('Помилка отримання моїх хакатонів:', error);
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
    }).populate('userId', 'name email avatar specialization ');

    // Форматуємо дані під наш фронтенд дизайн
    const members = teamMembers.map(member => ({
      _id: member._id,
      role: member.role,
      joinedAt: member.joinDate,
      email: member.email, 
      status: member.status,
      user: {
        _id: member.userId._id,
        name: member.userId.name,
        email: member.userId.email,
        avatar: member.userId.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.userId.name)}&background=6366f1&color=fff&size=128`
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

      // const mailOptions = {
      //   from: process.env.EMAIL_USER,
      //   to: user.email,
      //   subject: `Успішна реєстрація на хакатон: ${hackathon.title}`,
      //   html: `
      //     <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
      //       <h2 style="color: #4f46e5;">Вітаємо, ${user.name || 'учаснику'}! 🎉</h2>
      //       <p>Дякуємо Вам, що приєдналися до нашого хакатону <strong>"${hackathon.title}"</strong>.</p>
      //       <p>Ми раді бачити вас серед учасників. Це чудова можливість проявити свої навички, створити крутий проєкт та поборотися за призи!</p>
            
      //       <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
      //         <p style="margin: 0 0 10px 0;"><strong>📅 Дати проведення:</strong> з ${startDate} по ${endDate}</p>
      //         <p style="margin: 0 0 10px 0;"><strong>📍 Формат:</strong> ${hackathon.format === 'Online' ? 'Онлайн' : hackathon.location}</p>
      //       </div>

      //       <p>Ближче до початку ми надішлемо додаткову інформацію щодо формування команд та подальших кроків.</p>
      //       <p>Бажаємо успіхів та натхнення!</p>
      //       <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      //       <p style="color: #64748b; font-size: 14px;">З повагою,<br>Команда Hackathon Face</p>
      //     </div>
      //   `
      // };

      // try {
      //   await transporter.sendMail(mailOptions);
      //   console.log(`Лист про реєстрацію відправлено на ${user.email}`);
      // } catch (emailError) {
      //   console.error('Помилка відправки листа, але користувача зареєстровано:', emailError);
      // }
      resend.emails.send({
        from: 'Hackathon Face <onboarding@resend.dev>',
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
            <p>Бажаємо успіхів та натхнення!</p>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #64748b; font-size: 14px;">З повагою,<br>Команда Hackathon Face</p>
          </div>
        `
      }).then(() => console.log(`Лист відправлено на ${user.email}`))
        .catch(err => console.error('Помилка листа:', err));
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

    const deletedMember = await HackathonMember.findOneAndDelete({
      hackathonId: id,
      userId: userId,
      role: { $in: ['Participant', 'Co-organizer', 'Jury', 'Mentor'] } 
    });

    if (!deletedMember) {
      return res.status(400).json({ 
        message: 'Ви не є учасником чи членом команди цього хакатону, або не маєте прав для виходу' 
      });
    }

    res.status(200).json({ message: 'Ви успішно покинули хакатон' });

  } catch (error) {
    console.error('Помилка виходу з хакатону:', error);
    res.status(500).json({ message: 'Помилка сервера при скасуванні участі' });
  }
};

// 7. Видалення учасника організатором
exports.removeParticipant = async (req, res) => {
  try {
    const { id, memberId } = req.params;

    // Знаходимо і видаляємо запис з HackathonMember
    const deleted = await HackathonMember.findOneAndDelete({
      _id: memberId,
      hackathonId: id,
      role: 'Participant'
    });

    if (!deleted) {
      return res.status(404).json({ message: 'Учасника не знайдено на цьому хакатоні' });
    }

    res.status(200).json({ message: 'Учасника успішно видалено' });
  } catch (error) {
    console.error('Помилка видалення учасника:', error);
    res.status(500).json({ message: 'Помилка сервера при видаленні учасника' });
  }
};

// 8. Запрошення члена команди: Створює запис у базі даних та відправляє лист на пошту
exports.inviteToHackathon = async (req, res) => {
  const { id } = req.params; // ID хакатону
  const { email, role } = req.body;
  const inviterName = req.user.name; // Беремо ім'я того, хто запрошує (з мідлвари protect)

  try {
    const hackathon = await Hackathon.findById(id);
    if (!hackathon) return res.status(404).json({ message: 'Хакатон не знайдено' });

    const user = await User.findOne({ email });
    
    // Перевірка чи вже існує запис з таким email або userId
    const existingMember = await HackathonMember.findOne({
      hackathonId: id,
      $or: [
        { email: email },
        ...(user ? [{ userId: user._id }] : [])
      ]
    });

    if (existingMember) {
      const statusMsg = {
        'Accepted': 'вже є членом команди цього хакатону',
        'Pending':  'вже має активне запрошення на цей хакатон',
        'Rejected': 'вже відхилив запрошення на цей хакатон',
      };
      return res.status(400).json({ 
        message: `Користувач ${statusMsg[existingMember.status] || 'вже доданий до цього хакатону'}` 
      });
    }

    const newMember = new HackathonMember({
      hackathonId: id,
      userId: user ? user._id : null,
      email,
      role,
      status: 'Pending',
      invitedBy: inviterName 
    });
    await newMember.save();

    const inviteUrl = `${process.env.FRONTEND_URL}/join-hackathon/${newMember._id}`;

    // await transporter.sendMail({
    //   from: process.env.EMAIL_USER,
    //   to: email,
    //   subject: `Запрошення на хакатон "${hackathon.title}"`,
    //   html: `
    //     <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
    //       <h2 style="color: #4f46e5;">Вас запрошено!</h2>
    //       <p>Привіт! <strong>${inviterName}</strong> запрошує вас приєднатися до хакатону <strong>"${hackathon.title}"</strong> на роль <strong>${role}</strong>.</p>
    //       <p style="margin-bottom: 30px;">Це чудова можливість долучитися до крутого проєкту!</p>
    //       <a href="${inviteUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Переглянути запрошення</a>
    //       <p style="margin-top: 30px; font-size: 12px; color: #64748b;">Якщо ви не очікували цього листа, просто ігноруйте його.</p>
    //     </div>
    //   `
    // });
    resend.emails.send({
      from: 'Hackathon Face <onboarding@resend.dev>',
      to: email,
      subject: `Запрошення на хакатон "${hackathon.title}"`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #4f46e5;">Вас запрошено!</h2>
          <p>Привіт! <strong>${inviterName}</strong> запрошує вас приєднатися до хакатону <strong>"${hackathon.title}"</strong> на роль <strong>${role}</strong>.</p>
          <p style="margin-bottom: 30px;">Це чудова можливість долучитися до крутого проєкту!</p>
          <a href="${inviteUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Переглянути запрошення</a>
          <p style="margin-top: 30px; font-size: 12px; color: #64748b;">Якщо ви не очікували цього листа, просто ігноруйте його.</p>
        </div>
      `
    }).then(() => console.log(`Запрошення відправлено на ${email}`))
      .catch(err => console.error('Помилка запрошення:', err));

    res.status(200).json({ message: 'Запрошення надіслано' });
  } catch (error) {
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 9. Отримання даних про конкретне запрошення
exports.getInviteDetails = async (req, res) => {
  try {
    // Шукаємо мембера і "підтягуємо" дані хакатону (title)
    const invite = await HackathonMember.findById(req.params.memberId)
      .populate('hackathonId', 'title') 
      .populate('userId', 'name'); 

    if (!invite) return res.status(404).json({ message: 'Запрошення не знайдено' });

    res.status(200).json({
      hackathonTitle: invite.hackathonId.title,
      role: invite.role,
      inviter: invite.userId.name || "Організатор" 
    });
  } catch (error) {
    res.status(500).json({ message: 'Помилка отримання даних' });
  }
};

// 10. Роут: PATCH /api/hackathons/members/:memberId/respond
exports.respondToInvite = async (req, res) => {
  const { memberId } = req.params;
  const { status } = req.body; 

  try {
    const member = await HackathonMember.findById(memberId);
    if (!member) return res.status(404).json({ message: 'Запрошення не знайдено' });

    member.status = status;
    
    if (req.user && !member.userId) {
      member.userId = req.user._id;
    }

    await member.save();
    res.status(200).json({ message: `Запрошення ${status}`, member });
  } catch (error) {
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 11. Видалення члена команди
exports.removeMemberHackathon = async (req, res) => {
  try {
    const { id, memberId } = req.params;

    const requester = await HackathonMember.findOne({
      hackathonId: id,
      userId: req.userId,
      status: 'Accepted'
    });

    if (!requester) {
      return res.status(403).json({ message: 'Ви не є членом цього хакатону' });
    }

    // Кого видаляємо
    const target = await HackathonMember.findOne({
      _id: memberId,
      hackathonId: id
    });

    if (!target) {
      return res.status(404).json({ message: 'Члена команди не знайдено' });
    }

    // Основний організатор — той хто створив хакатон
    const hackathon = await Hackathon.findById(id);
    const isMainOrganizer = hackathon.organizerId.toString() === req.userId;

    // Логіка прав:
    // Основного організатора ніхто не може видалити
    if (hackathon.organizerId.toString() === target.userId?.toString()) {
      return res.status(403).json({ message: 'Не можна видалити головного організатора' });
    }

    // Тільки головний організатор може видаляти інших Organizer/Co-organizer
    if ((target.role === 'Organizer' || target.role === 'Co-organizer') && !isMainOrganizer) {
      return res.status(403).json({ message: 'Тільки головний організатор може видаляти організаторів' });
    }

    // Звичайний організатор може видаляти лише Jury/Mentor
    if (!isMainOrganizer && requester.role !== 'Organizer') {
      return res.status(403).json({ message: 'Недостатньо прав для видалення' });
    }

    await HackathonMember.findByIdAndDelete(memberId);
    res.status(200).json({ message: 'Учасника успішно видалено' });

  } catch (error) {
    console.error('Помилка видалення учасника:', error);
    res.status(500).json({ message: 'Помилка сервера при видаленні учасника' });
  }
};

// 12. Вся логіка для отримання даних вкладки Аналітика
exports.getHackathonAnalytics = async (req, res) => {
  try {
    const { id } = req.params;

    const hackathon = await Hackathon.findById(id);
    if (!hackathon) return res.status(404).json({ message: 'Хакатон не знайдено' });

    // Рахуємо дні до дедлайну
    const now = new Date();
    const endDate = new Date(hackathon.endDate);
    const diffTime = endDate - now;
    const daysToDeadline = diffTime > 0 ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : 0;

    // Рахуємо кількість команд
    const teamsCount = await Team.countDocuments({ hackathonId: id });

    // Отримуємо учасників і підтягуємо їхні дані з моделі User
    const members = await HackathonMember.find({ 
      hackathonId: id, 
      status: 'Accepted' 
    }).populate('userId', 'specialization');

    // Створюємо об'єкт для підрахунку ролей
    const roleBreakdown = {
      Participant: 0,
      'Co-organizer': 0,
      Mentor: 0,
      Jury: 0,
      Organizer: 1
    };

    // Формуємо дані для графіка "Розподіл за спеціалізаціями"
    const specializationCounts = {};
    const registrationsByDay = {};

    members.forEach(member => {
      // Підрахунок за ролями
      if (roleBreakdown[member.role] !== undefined) {
        roleBreakdown[member.role] += 1;
      }

      // Динаміка реєстрацій по днях
      const date = new Date(member.joinDate).toLocaleDateString('uk-UA', { month: 'short', day: 'numeric' });
      registrationsByDay[date] = (registrationsByDay[date] || 0) + 1;

      // Підрахунок спеціалізацій тільки для Participants
      if (member.role === 'Participant') {
        let specName = 'Без ролі';
        if (member.userId && member.userId.specialization && member.userId.specialization.trim() !== '') {
          specName = member.userId.specialization;
        }
        specializationCounts[specName] = (specializationCounts[specName] || 0) + 1;
      }
    });

    const rolesData = Object.keys(specializationCounts).map(spec => ({
      name: spec,
      value: specializationCounts[spec]
    }));

    const registrationsData = Object.keys(registrationsByDay).map(date => ({
      name: date,
      users: registrationsByDay[date]
    }));

    // Відправляємо на фронт
    res.status(200).json({
      pageViews: hackathon.views || 0,
      totalMembers: roleBreakdown.Participant,
      roleBreakdown,
      teamsCount: teamsCount,
      daysToDeadline,
      rolesData, // Це спеціалізації (Frontend, Backend)
      registrationsData
    });

  } catch (error) {
    console.error('Помилка аналітики:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 13. Зчитування кількісті переглядів хакатону
exports.incrementViews = async (req, res) => {
  try {
    const { id } = req.params;
    const hackathon = await Hackathon.findById(id);
    
    // Якщо користувач авторизований і він творець - НЕ рахуємо перегляд
    if (req.user && hackathon.creatorId.toString() === req.user._id.toString()) {
      return res.status(200).json({ message: 'Організатор, перегляд не зараховано' });
    }

    hackathon.views += 1;
    await hackathon.save();
    res.status(200).json({ message: 'Перегляд зараховано' });
  } catch (error) {
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 14. Перевірка ролі користувача для конкретного хакатону
exports.checkMyRole = async (req, res) => {
  try {
    const { id } = req.params; 
    const userId = req.userId; 

    const hackathon = await Hackathon.findById(id);
    if (!hackathon) {
      return res.status(404).json({ message: 'Хакатон не знайдено' });
    }

    // Перевіряємо, чи це головний організатор
    if (hackathon.organizerId.toString() === userId.toString()) {
      return res.status(200).json({ role: 'Organizer' });
    }

    // Якщо ні, шукаємо його в таблиці учасників
    const member = await HackathonMember.findOne({ 
      hackathonId: id, 
      userId: userId,
      status: 'Accepted' 
    });

    if (member) {
      return res.status(200).json({ role: member.role }); 
    }

    // Якщо взагалі не знайшли
    return res.status(200).json({ role: 'None' });

  } catch (error) {
    console.error('Помилка перевірки ролі:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 15. Отримання всіх хакатонів
exports.getAllHackathons = async (req, res) => {
  try {
    const { search, format, status, sort } = req.query;

    // Будуємо фільтр
    const filter = {};
    if (search) filter.title = { $regex: search, $options: 'i' };
    if (format) filter.format = format;

    // Сортування
    let sortOption = { startDate: 1 };
    if (sort === 'newest') sortOption = { createdAt: -1 };
    if (sort === 'oldest') sortOption = { startDate: 1 };
    if (sort === 'views') sortOption = { views: -1 };

    const hackathons = await Hackathon.find(filter).sort(sortOption).lean();

    // Підраховуємо учасників (тільки Participant + Accepted) для кожного хакатону
    const hackathonsWithCounts = await Promise.all(
      hackathons.map(async (hack) => {
        const participantsCount = await HackathonMember.countDocuments({
          hackathonId: hack._id,
          role: 'Participant',
          status: 'Accepted'
        });
        return { ...hack, participantsCount };
      })
    );

    // Фільтр по статусу
    let result = hackathonsWithCounts;
    if (status) {
      const now = new Date();
      result = result.filter(hack => {
        const start = new Date(hack.startDate);
        const end = new Date(hack.endDate);
        if (status === 'Ongoing') return now >= start && now <= end;
        if (status === 'Upcoming') return now < start;
        if (status === 'Completed') return now > end;
        return true;
      });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Помилка при отриманні всіх хакатонів:', error);
    res.status(500).json({ message: 'Помилка сервера при завантаженні хакатонів' });
  }
};

// 16. Отримання загальної кількості учасників на всіх хакатонах
exports.getTotalStats = async (req, res) => {
  try {
    const totalHackathons = await Hackathon.countDocuments();

    // Унікальні userId серед всіх Participant + Accepted
    const uniqueParticipants = await HackathonMember.distinct('userId', {
      role: 'Participant',
      status: 'Accepted'
    });

    res.status(200).json({
      totalHackathons,
      totalParticipants: uniqueParticipants.length,
    });
  } catch (error) {
    res.status(500).json({ message: 'Помилка сервера' });
  }
};