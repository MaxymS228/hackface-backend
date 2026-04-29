const HackathonMember = require('../models/HackathonMember');
const TeamMember = require('../models/TeamMember');
const Project = require('../models/Project');

exports.getDashboardSummary = async (req, res) => {
  try {
    // ID користувача братимемо з параметрів (або пізніше з JWT токена)
    const { userId } = req.params;

    // 1. Шукаємо всі хакатони, де користувач є учасником/суддею/організатором
    // Використовуємо .populate(), щоб одразу витягнути деталі хакатону, а не тільки його ID
    const hackathonRoles = await HackathonMember.find({ userId }).populate('hackathonId');

    // 2. Шукаємо всі команди, в яких є користувач
    const teamMemberships = await TeamMember.find({ userId }).populate('teamId');
    
    // Витягуємо тільки ID команд, щоб знайти їхні проєкти
    const teamIds = teamMemberships.map(tm => tm.teamId._id);

    // 3. Шукаємо проєкти, які належать до команд користувача
    const projects = await Project.find({ teamId: { $in: teamIds } });

    // 4. Формуємо зручну відповідь для фронтенду
    res.status(200).json({
      success: true,
      data: {
        roles: hackathonRoles,
        teams: teamMemberships,
        projects: projects
      }
    });

  } catch (error) {
    console.error('Помилка завантаження дашборду:', error);
    res.status(500).json({ success: false, message: 'Помилка сервера' });
  }
};