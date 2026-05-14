const HackathonMember = require('../models/HackathonMember');
const TeamMember = require('../models/TeamMember');
const Project = require('../models/Project');
const Hackathon = require('../models/Hackathon'); // Додали імпорт моделі хакатону

exports.getDashboardSummary = async (req, res) => {
  try {
    const userId = req.userId; 

    if (!userId) {
      return res.status(401).json({ success: false, message: 'Не авторизовано' });
    }

    // 1. Шукаємо всі хакатони, де користувач є учасником/суддею
    //const hackathonRoles = await HackathonMember.find({ userId }).populate('hackathonId');

    const hackathonRoles = await HackathonMember.find({ 
      userId: userId,
      $or: [
        { status: 'Accepted' }
      ]
    }).populate('hackathonId');

    // 2. Шукаємо всі хакатони, де користувач є ОРГАНІЗАТОРОМ
    const organizedHackathons = await Hackathon.find({ organizerId: userId });

    // 3. Формуємо єдиний список хакатонів для фронтенду
    let allHackathons = [];

    // Додаємо організовані хакатони
    organizedHackathons.forEach(hack => {
      allHackathons.push({
        ...hack.toObject(),
        userRole: 'Organizer' // Вказуємо, що тут він організатор
      });
    });

    // Додаємо хакатони, де він учасник (щоб не було дублів)
    hackathonRoles.forEach(member => {
      if (member.hackathonId) {
        const exists = allHackathons.find(h => h._id.toString() === member.hackathonId._id.toString());
        if (!exists) {
          allHackathons.push({
            ...member.hackathonId.toObject(),
            userRole: member.role || 'Participant'
          });
        }
      }
    });

    // Сортуємо: найновіші хакатони зверху
    allHackathons.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // 4. Шукаємо всі команди, в яких є користувач
    const teamMemberships = await TeamMember.find({ userId }).populate('teamId');
    
    // Витягуємо тільки ID команд, щоб знайти їхні проєкти
    const teamIds = teamMemberships
      .filter(tm => tm.teamId) // Захист від видалених команд
      .map(tm => tm.teamId._id);

    // 5. Шукаємо проєкти, які належать до команд користувача
    const projects = await Project.find({ teamId: { $in: teamIds } });

    // 6. Відправляємо дані на фронтенд
    res.status(200).json({
      success: true,
      data: {
        roles: hackathonRoles,
        teams: teamMemberships,
        projects: projects,
        hackathons: allHackathons
      }
    });

  } catch (error) {
    console.error('Помилка завантаження дашборду:', error);
    res.status(500).json({ success: false, message: 'Помилка сервера' });
  }
};