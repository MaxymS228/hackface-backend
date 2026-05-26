const Task = require('../models/Task');
const TaskScore = require('../models/TaskScore');
const Hackathon = require('../models/Hackathon');
const HackathonMember = require('../models/HackathonMember');
const Team = require('../models/Team');

const checkOrganizerAccess = async (hackathonId, userId) => {
  const hackathon = await Hackathon.findById(hackathonId);
  if (!hackathon) return { allowed: false };
  const isOrganizer = hackathon.organizerId.toString() === userId;
  const isCoOrg = await HackathonMember.findOne({
    hackathonId, userId, role: 'Co-organizer', status: 'Accepted'
  });
  return { allowed: isOrganizer || !!isCoOrg, isMain: isOrganizer, hackathon };
};

// 1. Створити завдання
exports.createTask = async (req, res) => {
  try {
    const { hackathonId } = req.params;
    const { title, description, stage, criteria, opensAt, closesAt } = req.body;
    const userId = req.userId;

    const { allowed } = await checkOrganizerAccess(hackathonId, userId);
    if (!allowed) return res.status(403).json({ message: 'Недостатньо прав' });

    if (!criteria || criteria.length === 0) {
      return res.status(400).json({ message: 'Потрібен хоча б один критерій оцінювання' });
    }

    const task = new Task({
      hackathonId, title, description,
      stage: Number(stage),
      criteria,
      opensAt: opensAt || null,
      closesAt: closesAt || null,
    });
    await task.save();

    res.status(201).json({ message: 'Завдання створено', task });
  } catch (error) {
    console.error('Помилка створення завдання:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 2. Отримати всі завдання хакатону
exports.getHackathonTasks = async (req, res) => {
  try {
    const { hackathonId } = req.params;
    const userId = req.userId;

    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) return res.status(404).json({ message: 'Хакатон не знайдено' });

    const isOrganizer = hackathon.organizerId.toString() === userId;
    const isCoOrg = await HackathonMember.findOne({
      hackathonId, userId, role: 'Co-organizer', status: 'Accepted'
    });
    const isOrg = isOrganizer || !!isCoOrg;

    const now = new Date();
    const filter = { hackathonId };

    // Учасники та журі бачать тільки відкриті завдання
    if (!isOrg) {
      filter.isVisible = true;
      filter.$or = [
        { opensAt: null },
        { opensAt: { $lte: now } }
      ];
    }

    const tasks = await Task.find(filter).sort({ stage: 1, createdAt: 1 });
    res.status(200).json(tasks);
  } catch (error) {
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 3. Оновити завдання
exports.updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title, description, stage, criteria, opensAt, closesAt, isVisible } = req.body;
    const userId = req.userId;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Завдання не знайдено' });

    const { allowed } = await checkOrganizerAccess(task.hackathonId, userId);
    if (!allowed) return res.status(403).json({ message: 'Недостатньо прав' });

    if (title) task.title = title;
    if (description !== undefined) task.description = description;
    if (stage) task.stage = Number(stage);
    if (criteria && criteria.length > 0) task.criteria = criteria;
    if (opensAt !== undefined) task.opensAt = opensAt || null;
    if (closesAt !== undefined) task.closesAt = closesAt || null;
    if (isVisible !== undefined) task.isVisible = isVisible;

    await task.save();
    res.status(200).json({ message: 'Завдання оновлено', task });
  } catch (error) {
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 4. Видалити завдання
exports.deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const userId = req.userId;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Завдання не знайдено' });

    const { allowed } = await checkOrganizerAccess(task.hackathonId, userId);
    if (!allowed) return res.status(403).json({ message: 'Недостатньо прав' });

    await Task.findByIdAndDelete(taskId);
    await TaskScore.deleteMany({ taskId });

    res.status(200).json({ message: 'Завдання видалено' });
  } catch (error) {
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 5. Виставити оцінку команді за завдання (Журі)
exports.submitTaskScore = async (req, res) => {
  try {
    const { taskId, teamId } = req.params;
    const { scores, comment } = req.body;
    const userId = req.userId;

    const task = await Task.findById(taskId);
    if (!task) return res.status(404).json({ message: 'Завдання не знайдено' });

    // Перевірка дедлайну
    if (task.closesAt && new Date() > new Date(task.closesAt)) {
      return res.status(400).json({ message: 'Дедлайн оцінювання вийшов' });
    }

    // Перевірка чи є журі
    const isJury = await HackathonMember.findOne({
      hackathonId: task.hackathonId, userId, role: 'Jury', status: 'Accepted'
    });

    // Організатор також може оцінювати
    const hackathon = await Hackathon.findById(task.hackathonId);
    const isOrg = hackathon.organizerId.toString() === userId;
    const isCoOrg = await HackathonMember.findOne({
      hackathonId: task.hackathonId, userId, role: 'Co-organizer', status: 'Accepted'
    });

    if (!isJury && !isOrg && !isCoOrg) {
      return res.status(403).json({ message: 'Недостатньо прав для оцінювання' });
    }

    // Перевіряємо що всі критерії заповнені
    const criteriaNames = task.criteria.map(c => c.name);
    for (const criterion of task.criteria) {
      const score = scores.find(s => s.criterionName === criterion.name);
      if (!score) return res.status(400).json({ message: `Не вистачає оцінки для критерію: ${criterion.name}` });
      if (score.score < 0 || score.score > criterion.maxScore) {
        return res.status(400).json({ message: `Бал для "${criterion.name}" має бути від 0 до ${criterion.maxScore}` });
      }
    }

    const totalScore = scores.reduce((sum, s) => sum + s.score, 0);

    // Upsert
    const taskScore = await TaskScore.findOneAndUpdate(
      { taskId, teamId, juryId: userId },
      {
        taskId, teamId, juryId: userId,
        hackathonId: task.hackathonId,
        scores, comment: comment || '',
        totalScore,
        submittedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: 'Оцінку виставлено', taskScore });
  } catch (error) {
    console.error('Помилка оцінювання:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 6. Таблиця результатів (публічна)
exports.getResultsTable = async (req, res) => {
  try {
    const { hackathonId } = req.params;

    const tasks = await Task.find({ hackathonId, isVisible: true }).sort({ stage: 1 });
    if (tasks.length === 0) return res.status(200).json({ tasks: [], teams: [] });

    // Всі команди хакатону
    const teams = await Team.find({ hackathonId })
      .populate('captainId', 'name')
      .lean();

    // Всі оцінки
    const allScores = await TaskScore.find({ hackathonId });

    const teamMembersMap = {};
    const allMembers = await HackathonMember.find({
      hackathonId,
      teamId: { $in: teams.map(t => t._id) },
      status: 'Accepted'
    }).populate('userId', 'name _id').lean();

    allMembers.forEach(m => {
      const tid = m.teamId.toString();
      if (!teamMembersMap[tid]) teamMembersMap[tid] = [];
      teamMembersMap[tid].push({
        _id: m._id,
        teamRole: m.teamRole,
        user: { _id: m.userId?._id, name: m.userId?.name }
      });
    });

    // Формуємо таблицю
    const tableData = teams.map(team => {
      const taskScores = tasks.map(task => {
        const scores = allScores.filter(
          s => s.taskId.toString() === task._id.toString() &&
               s.teamId.toString() === team._id.toString()
        );

        if (scores.length === 0) return { taskId: task._id, score: null, juryCount: 0 };

        // Середнє між всіма журі
        const avg = scores.reduce((sum, s) => sum + s.totalScore, 0) / scores.length;
        return {
          taskId: task._id,
          score: Math.round(avg * 10) / 10,
          juryCount: scores.length
        };
      });

      const totalScore = taskScores.reduce((sum, ts) => sum + (ts.score || 0), 0);

      return {
        team: { _id: team._id, name: team.name },
        members: teamMembersMap[team._id.toString()] || [],
        taskScores,
        totalScore: Math.round(totalScore * 10) / 10
      };
    });

    // Сортуємо за загальним балом
    tableData.sort((a, b) => b.totalScore - a.totalScore);

    res.status(200).json({ tasks, teams: tableData });
  } catch (error) {
    console.error('Помилка таблиці результатів:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 7. Отримати оцінки для конкретного завдання і команди (для журі)
exports.getTaskScoreForTeam = async (req, res) => {
  try {
    const { taskId, teamId } = req.params;
    const userId = req.userId;

    const myScore = await TaskScore.findOne({ taskId, teamId, juryId: userId });
    const allScores = await TaskScore.find({ taskId, teamId })
      .populate('juryId', 'name');

    res.status(200).json({ myScore, allScores });
  } catch (error) {
    res.status(500).json({ message: 'Помилка сервера' });
  }
};