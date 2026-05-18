const Team = require('../models/Team');
const HackathonMember = require('../models/HackathonMember');
const Hackathon = require('../models/Hackathon');
const User = require('../models/User');
const TeamApplication = require('../models/TeamApplication')

// 1. Створення команди
exports.createTeam = async (req, res) => {
  try {
    const { hackathonId, name, description, projectIdea, lookingFor } = req.body;
    const userId = req.userId;

    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) return res.status(404).json({ message: 'Хакатон не знайдено' });

    // Перевірка чи учасник зареєстрований на цей хакатон
    const member = await HackathonMember.findOne({
      hackathonId, userId, role: 'Participant', status: 'Accepted'
    });
    if (!member) return res.status(403).json({ message: 'Ви не є учасником цього хакатону' });

    // Перевірка чи вже є в команді
    if (member.teamId) return res.status(400).json({ message: 'Ви вже перебуваєте в команді' });

    // Перевірка чи вже є команда з такою назвою в цьому хакатоні
    const existingTeam = await Team.findOne({ hackathonId, name });
    if (existingTeam) return res.status(400).json({ message: 'Команда з такою назвою вже існує' });

    // Створення команди
    const team = new Team({
      name,
      hackathonId,
      captainId: userId,
      description,
      projectIdea,
      lookingFor: lookingFor || [],
    });
    await team.save();

    // Призначаємо капітаном
    member.teamId = team._id;
    member.teamRole = 'Captain';
    await member.save();

    res.status(201).json({ message: 'Команду успішно створено', team });
  } catch (error) {
    console.error('Помилка створення команди:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 2. Отримання команд що шукають учасників
exports.getTeamsLookingForMembers = async (req, res) => {
  try {
    const { hackathonId } = req.params;
    const { role } = req.query; // Фільтр за роллю

    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) return res.status(404).json({ message: 'Хакатон не знайдено' });

    const filter = { hackathonId, isOpen: true };

    const teams = await Team.find(filter)
      .populate('captainId', 'name avatar')
      .lean();

    // Для кожної команди рахуємо кількість учасників
    const teamsWithCount = await Promise.all(
      teams.map(async (team) => {
        const membersCount = await HackathonMember.countDocuments({
          teamId: team._id, status: 'Accepted'
        });

        // Фільтр за роллю якщо передано
        if (role && !team.lookingFor.includes(role)) return null;

        // Закриваємо команду якщо вже заповнена
        if (membersCount >= hackathon.maxTeamSize) {
          await Team.findByIdAndUpdate(team._id, { isOpen: false });
          return null;
        }

        return { ...team, membersCount, spotsLeft: hackathon.maxTeamSize - membersCount };
      })
    );

    const result = teamsWithCount.filter(Boolean);
    res.status(200).json(result);
  } catch (error) {
    console.error('Помилка отримання команд:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 3. Подати заявку в команду
exports.applyToTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { coverLetter, primaryRole } = req.body;
    const userId = req.userId;

    const team = await Team.findById(teamId).populate('hackathonId');
    if (!team) return res.status(404).json({ message: 'Команду не знайдено' });
    if (!team.isOpen) return res.status(400).json({ message: 'Команда більше не приймає учасників' });

    // Перевірка блокування (за годину до старту)
    if (team.lockedAt && new Date() >= team.lockedAt) {
      return res.status(403).json({ message: 'Команда заблокована — хакатон скоро починається' });
    }

    // Перевірка чи учасник хакатону
    const member = await HackathonMember.findOne({
      hackathonId: team.hackathonId._id, userId, role: 'Participant', status: 'Accepted'
    });
    if (!member) return res.status(403).json({ message: 'Ви не є учасником цього хакатону' });
    if (member.teamId) return res.status(400).json({ message: 'Ви вже перебуваєте в команді' });

    // Перевірка чи вже подав заявку
    const existingApplication = await TeamApplication.findOne({
      teamId, applicantId: userId, status: 'Pending'
    });
    if (existingApplication) return res.status(400).json({ message: 'Ви вже подали заявку в цю команду' });

    // Перевірка максимальної кількості
    const membersCount = await HackathonMember.countDocuments({
      teamId, status: 'Accepted'
    });
    if (membersCount >= team.hackathonId.maxTeamSize) {
      return res.status(400).json({ message: 'Команда вже заповнена' });
    }

    const application = new TeamApplication({
      teamId,
      applicantId: userId,
      hackathonId: team.hackathonId._id,
      coverLetter: coverLetter || '',
      primaryRole: primaryRole || 'Other'
    });
    await application.save();

    // Оновлюємо primaryRole учасника
    if (primaryRole) {
      member.primaryRole = primaryRole;
      await member.save();
    }

    res.status(201).json({ message: 'Заявку успішно подано' });
  } catch (error) {
    console.error('Помилка подачі заявки:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 4. Прийняти або відхилити заявку (Капітан)
exports.handleApplication = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { action } = req.body; // 'accept' | 'reject'
    const userId = req.userId;

    const application = await TeamApplication.findById(applicationId)
      .populate('teamId')
      .populate('applicantId', 'name email');

    if (!application) return res.status(404).json({ message: 'Заявку не знайдено' });

    // Перевірка чи капітан
    if (application.teamId.captainId.toString() !== userId) {
      return res.status(403).json({ message: 'Тільки капітан може керувати заявками' });
    }

    // Перевірка блокування
    if (application.teamId.lockedAt && new Date() >= application.teamId.lockedAt) {
      return res.status(403).json({ message: 'Команда заблокована' });
    }

    if (action === 'accept') {
      // Перевірка максимальної кількості
      const hackathon = await Hackathon.findById(application.hackathonId);
      const membersCount = await HackathonMember.countDocuments({
        teamId: application.teamId._id, status: 'Accepted'
      });
      if (membersCount >= hackathon.maxTeamSize) {
        return res.status(400).json({ message: 'Команда вже заповнена' });
      }

      // Додаємо учасника до команди
      const member = await HackathonMember.findOne({
        hackathonId: application.hackathonId,
        userId: application.applicantId._id,
        role: 'Participant'
      });
      member.teamId = application.teamId._id;
      member.teamRole = 'Member';
      await member.save();

      application.status = 'Accepted';

      // Якщо команда заповнена — закриваємо
      if (membersCount + 1 >= hackathon.maxTeamSize) {
        await Team.findByIdAndUpdate(application.teamId._id, { isOpen: false });
      }
    } else {
      application.status = 'Rejected';
    }

    await application.save();
    res.status(200).json({ message: action === 'accept' ? 'Учасника прийнято' : 'Заявку відхилено' });
  } catch (error) {
    console.error('Помилка обробки заявки:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 5. Отримати деталі команди (TeamWorkspace)
exports.getTeamDetails = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.userId;

    const team = await Team.findById(teamId)
      .populate('captainId', 'name avatar email')
      .populate('hackathonId', 'title startDate endDate maxTeamSize minTeamSize');

    if (!team) return res.status(404).json({ message: 'Команду не знайдено' });

    // Учасники команди
    const members = await HackathonMember.find({
      teamId, status: 'Accepted'
    }).populate('userId', 'name avatar email specialization');

    // Заявки (тільки для капітана)
    const isCaptain = team.captainId._id.toString() === userId;
    let applications = [];
    if (isCaptain) {
      applications = await TeamApplication.find({ teamId, status: 'Pending' })
        .populate('applicantId', 'name avatar email');
    }

    res.status(200).json({
      team,
      members: members.map(m => ({
        _id: m._id,
        teamRole: m.teamRole,
        primaryRole: m.primaryRole,
        user: m.userId
      })),
      applications: isCaptain ? applications : [],
      isCaptain,
      isLocked: team.lockedAt && new Date() >= team.lockedAt
    });
  } catch (error) {
    console.error('Помилка отримання команди:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 6. Отримати всі команди хакатону
exports.getHackathonTeams = async (req, res) => {
  try {
    const { hackathonId } = req.params;

    const teams = await Team.find({ hackathonId })
      .populate('captainId', 'name avatar')
      .lean();

    const teamsWithMembers = await Promise.all(
      teams.map(async (team) => {
        const members = await HackathonMember.find({
          teamId: team._id, status: 'Accepted'
        }).populate('userId', 'name avatar');
        //console.log('MEMBERS для команди', team.name, ':', JSON.stringify(members[0], null, 2));
        return { ...team, members };
      })
    );

    res.status(200).json(teamsWithMembers);
  } catch (error) {
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 7. Видалити учасника з команди (Капітан)
exports.removeMemberFromTeam = async (req, res) => {
  try {
    const { teamId, memberId } = req.params;
    const userId = req.userId;

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Команду не знайдено' });
    if (team.captainId.toString() !== userId) {
      return res.status(403).json({ message: 'Тільки капітан може видаляти учасників' });
    }

    // Блокування за годину до старту
    if (team.lockedAt && new Date() >= team.lockedAt) {
      return res.status(403).json({ message: 'Команда заблокована — не можна видаляти учасників' });
    }

    const member = await HackathonMember.findById(memberId);
    if (!member || member.teamId?.toString() !== teamId) {
      return res.status(404).json({ message: 'Учасника не знайдено в команді' });
    }
    if (member.userId?.toString() === userId) {
      return res.status(400).json({ message: 'Капітан не може видалити себе' });
    }

    member.teamId = null;
    member.teamRole = null;
    await member.save();

    // Якщо команда була закрита — відкриваємо знову
    if (!team.isOpen) {
      team.isOpen = true;
      await team.save();
    }

    res.status(200).json({ message: 'Учасника видалено з команди' });
  } catch (error) {
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 8. Авторозподіл учасників (Організатор)
exports.autoMatchmaking = async (req, res) => {
  try {
    const { hackathonId } = req.params;
    const userId = req.userId;

    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) return res.status(404).json({ message: 'Хакатон не знайдено' });
    if (hackathon.organizerId.toString() !== userId) {
      return res.status(403).json({ message: 'Тільки організатор може запустити авторозподіл' });
    }

    const { minTeamSize, maxTeamSize } = hackathon;
    const targetSize = Math.floor((minTeamSize + maxTeamSize) / 2);

    // Соло учасники (без команди)
    const soloMembers = await HackathonMember.find({
      hackathonId, role: 'Participant', status: 'Accepted', teamId: null
    });

    if (soloMembers.length === 0) {
      return res.status(200).json({ message: 'Всі учасники вже в командах' });
    }

    // Фаза 1: Доукомплектування існуючих команд
    const openTeams = await Team.find({ hackathonId, isOpen: true });
    let soloIndex = 0;

    for (const team of openTeams) {
      const membersCount = await HackathonMember.countDocuments({
        teamId: team._id, status: 'Accepted'
      });
      const spotsLeft = maxTeamSize - membersCount;

      for (let i = 0; i < spotsLeft && soloIndex < soloMembers.length; i++) {
        const solo = soloMembers[soloIndex];
        solo.teamId = team._id;
        solo.teamRole = 'Member';
        await solo.save();
        soloIndex++;
      }

      // Перевіряємо чи команда заповнена
      const newCount = await HackathonMember.countDocuments({ teamId: team._id, status: 'Accepted' });
      if (newCount >= maxTeamSize) {
        team.isOpen = false;
        await team.save();
      }
    }

    // Фаза 2: Створення нових команд для решти
    const remaining = soloMembers.slice(soloIndex);
    const teamNames = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta', 'Iota', 'Kappa'];
    let nameIndex = 0;
    let created = 0;

    while (remaining.length > 0) {
      // Edge case: якщо залишилось менше ніж minTeamSize
      let groupSize = targetSize;
      if (remaining.length < minTeamSize) {
        // Отримуємо актуальні відкриті команди
        const availableTeams = await Team.find({ hackathonId, isOpen: true });
        
        for (const solo of remaining) {
          // Шукаємо першу команду, де ще є фізичне місце
          let assigned = false;
          for (const team of availableTeams) {
            const membersCount = await HackathonMember.countDocuments({ teamId: team._id, status: 'Accepted' });
            
            if (membersCount < maxTeamSize) {
              solo.teamId = team._id;
              solo.teamRole = 'Member';
              await solo.save();
              
              // Якщо команда тепер заповнена, закриваємо її, щоб наступний solo туди не потрапив
              if (membersCount + 1 >= maxTeamSize) {
                team.isOpen = false;
                await team.save();
              }
              assigned = true;
              break;
            }
          }
          
          // Якщо відкритих команд з місцями не лишилося, створюємо для залишку мікро-команду
          if (!assigned) {
             const newTeam = new Team({
               name: `Team #${Date.now()}`,
               hackathonId,
               captainId: solo.userId,
               isAutoGenerated: true,
               isOpen: false,
             });
             await newTeam.save();
             solo.teamId = newTeam._id;
             solo.teamRole = 'Captain';
             await solo.save();
          }
        }
        break;
      }

      const group = remaining.splice(0, groupSize);
      const teamName = teamNames[nameIndex] ? `Team ${teamNames[nameIndex]}` : `Team #${Date.now()}`;
      nameIndex++;

      const newTeam = new Team({
        name: teamName,
        hackathonId,
        captainId: group[0].userId, // Перший стає капітаном
        isAutoGenerated: true,
        isOpen: group.length < maxTeamSize,
      });
      await newTeam.save();

      // Призначаємо учасників
      for (let i = 0; i < group.length; i++) {
        group[i].teamId = newTeam._id;
        group[i].teamRole = i === 0 ? 'Captain' : 'Member';
        await group[i].save();
      }
      created++;
    }

    res.status(200).json({
      message: `Авторозподіл завершено. Створено нових команд: ${created}. Розподілено учасників: ${soloMembers.length}`
    });
  } catch (error) {
    console.error('Помилка авторозподілу:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 9. Заблокувати всі команди (за годину до старту)
exports.lockAllTeams = async (req, res) => {
  try {
    const { hackathonId } = req.params;
    const { unlock } = req.body;
    const userId = req.userId;

    const hackathon = await Hackathon.findById(hackathonId);
    if (hackathon.organizerId.toString() !== userId) {
      return res.status(403).json({ message: 'Тільки організатор може блокувати команди' });
    }
    if (unlock) {
      await Team.updateMany({ hackathonId }, { lockedAt: null, isOpen: true });
      return res.status(200).json({ message: 'Всі команди розблоковано' });
    }

    const lockTime = new Date();
    await Team.updateMany({ hackathonId }, { lockedAt: lockTime, isOpen: false });

    res.status(200).json({ message: 'Всі команди заблоковано' });
  } catch (error) {
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 10. Оновлення даних команди
exports.updateTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { name, description, projectIdea, lookingFor, isOpen } = req.body;
    const userId = req.userId;

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Команду не знайдено' });
    if (team.captainId.toString() !== userId) {
      return res.status(403).json({ message: 'Тільки капітан може редагувати команду' });
    }

    if (name) team.name = name;
    if (description !== undefined) team.description = description;
    if (projectIdea !== undefined) team.projectIdea = projectIdea;
    if (lookingFor) team.lookingFor = lookingFor;
    if (isOpen !== undefined) team.isOpen = isOpen;

    await team.save();
    res.status(200).json({ message: 'Команду оновлено', team });
  } catch (error) {
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 11. // Отримати всі команди поточного користувача
exports.getMyTeams = async (req, res) => {
  try {
    const userId = req.userId;

    // Шукаємо всі записи де юзер є учасником команди
    const memberships = await HackathonMember.find({
      userId,
      teamId: { $ne: null },
      role: 'Participant',
      status: 'Accepted'
    }).populate('hackathonId', 'title startDate endDate banner status');

    if (memberships.length === 0) {
      return res.status(200).json([]);
    }

    // Отримуємо деталі кожної команди
    const teams = await Promise.all(
      memberships.map(async (member) => {
        const team = await Team.findById(member.teamId)
          .populate('captainId', 'name avatar');

        if (!team) return null;

        // Кількість учасників
        const membersCount = await HackathonMember.countDocuments({
          teamId: team._id,
          status: 'Accepted'
        });

        // Кількість нових заявок (тільки для капітана)
        const isCaptain = team.captainId._id.toString() === userId;
        const pendingApplications = isCaptain
          ? await TeamApplication.countDocuments({ teamId: team._id, status: 'Pending' })
          : 0;

        return {
          _id: team._id,
          name: team.name,
          description: team.description,
          projectIdea: team.projectIdea,
          lookingFor: team.lookingFor,
          isOpen: team.isOpen,
          isAutoGenerated: team.isAutoGenerated,
          inviteCode: isCaptain ? team.inviteCode : null,
          lockedAt: team.lockedAt,
          captainId: team.captainId,
          isCaptain,
          teamRole: member.teamRole,
          primaryRole: member.primaryRole,
          membersCount,
          pendingApplications,
          hackathon: member.hackathonId,
        };
      })
    );

    res.status(200).json(teams.filter(Boolean));
  } catch (error) {
    console.error('Помилка отримання команд:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 12. Статистика команд для організатора
exports.getTeamsStats = async (req, res) => {
  try {
    const { hackathonId } = req.params;

    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) return res.status(404).json({ message: 'Хакатон не знайдено' });

    // Всього команд
    const totalTeams = await Team.countDocuments({ hackathonId });

    // Всі команди з учасниками
    const teams = await Team.find({ hackathonId })
      .populate('captainId', 'name avatar')
      .lean();

    const teamsWithMembers = await Promise.all(
      teams.map(async (team) => {
        const members = await HackathonMember.find({
          teamId: team._id, status: 'Accepted'
        }).populate('userId', 'name email avatar');

        return {
          ...team,
          members: members.map(m => ({
            _id: m._id,
            teamRole: m.teamRole,
            primaryRole: m.primaryRole,
            user: m.userId
          })),
          membersCount: members.length
        };
      })
    );

    // Учасників у командах
    const membersInTeams = await HackathonMember.countDocuments({
      hackathonId,
      role: 'Participant',
      status: 'Accepted',
      teamId: { $ne: null }
    });

    // Учасників без команди
    const soloMembers = await HackathonMember.find({
      hackathonId,
      role: 'Participant',
      status: 'Accepted',
      teamId: null
    }).populate('userId', 'name email avatar');

    // Чи заблоковані команди
    const lockedTeam = await Team.findOne({ hackathonId, lockedAt: { $ne: null } });
    const isLocked = !!lockedTeam;

    res.status(200).json({
      totalTeams,
      membersInTeams,
      soloMembersCount: soloMembers.length,
      soloMembers: soloMembers.map(m => ({
        _id: m._id,
        user: m.userId,
        primaryRole: m.primaryRole,
      })),
      teams: teamsWithMembers,
      isLocked,
      hackathon: {
        minTeamSize: hackathon.minTeamSize,
        maxTeamSize: hackathon.maxTeamSize,
      }
    });
  } catch (error) {
    console.error('Помилка отримання статистики:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 13. Видалення команди організатором
exports.deleteTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.userId;

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Команду не знайдено' });

    const hackathon = await Hackathon.findById(team.hackathonId);
    if (hackathon.organizerId.toString() !== userId) {
      return res.status(403).json({ message: 'Тільки організатор може видаляти команди' });
    }

    // Звільняємо всіх учасників
    await HackathonMember.updateMany(
      { teamId },
      { $set: { teamId: null, teamRole: null } }
    );

    await TeamApplication.deleteMany({ teamId });
    await Team.findByIdAndDelete(teamId);

    res.status(200).json({ message: 'Команду видалено' });
  } catch (error) {
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 14. Ручне додавання учасника організатором
exports.addMemberByOrganizer = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { memberId } = req.body;
    const userId = req.userId;

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Команду не знайдено' });

    const hackathon = await Hackathon.findById(team.hackathonId);
    if (hackathon.organizerId.toString() !== userId) {
      return res.status(403).json({ message: 'Тільки організатор може додавати учасників' });
    }

    const membersCount = await HackathonMember.countDocuments({ teamId, status: 'Accepted' });
    if (membersCount >= hackathon.maxTeamSize) {
      return res.status(400).json({ message: 'Команда вже заповнена' });
    }

    const member = await HackathonMember.findById(memberId);
    if (!member) return res.status(404).json({ message: 'Учасника не знайдено' });
    if (member.teamId) return res.status(400).json({ message: 'Учасник вже в команді' });

    member.teamId = teamId;
    member.teamRole = 'Member';
    await member.save();

    if (membersCount + 1 >= hackathon.maxTeamSize) {
      team.isOpen = false;
      await team.save();
    }

    res.status(200).json({ message: 'Учасника додано до команди' });
  } catch (error) {
    res.status(500).json({ message: 'Помилка сервера' });
  }
};