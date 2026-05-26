const Assessment = require('../models/Assessment');
const Project = require('../models/Project');
const Hackathon = require('../models/Hackathon');
const HackathonMember = require('../models/HackathonMember');
const User = require('../models/User');

// Допоміжна функція перевірки прав організатора
const checkOrganizerAccess = async (hackathonId, userId) => {
  const hackathon = await Hackathon.findById(hackathonId);
  if (!hackathon) return { allowed: false };
  const isOrganizer = hackathon.organizerId.toString() === userId;
  const isCoOrg = await HackathonMember.findOne({
    hackathonId, userId, role: 'Co-organizer', status: 'Accepted'
  });
  return { allowed: isOrganizer || !!isCoOrg, isMain: isOrganizer, hackathon };
};

// 1. Статистика для ManageSubmissions
exports.getSubmissionsStats = async (req, res) => {
  try {
    const { hackathonId } = req.params;
    const userId = req.userId;

    const { allowed } = await checkOrganizerAccess(hackathonId, userId);
    if (!allowed) return res.status(403).json({ message: 'Недостатньо прав' });

    // Всі здані проєкти
    const projects = await Project.find({ hackathonId })
      .populate('teamId', 'name')
      .populate('assignedJury', 'name email avatar')
      .sort({ submittedAt: -1 });

    // Всі журі хакатону
    const juryMembers = await HackathonMember.find({
      hackathonId, role: 'Jury', status: 'Accepted'
    }).populate('userId', 'name email avatar');

    // Всі оцінки
    const assessments = await Assessment.find({ hackathonId });

    // Статистика по журі
    const juryStats = juryMembers.map(member => {
      const myAssessments = assessments.filter(
        a => a.userId.toString() === member.userId._id.toString()
      );
      const completedCount = myAssessments.filter(a => a.isCompleted).length;

      // Скільки проєктів призначено цьому судді
      const assignedCount = projects.filter(p =>
        p.assignedJury.some(j => j._id.toString() === member.userId._id.toString())
      ).length;

      return {
        _id: member._id,
        user: member.userId,
        assignedCount,
        completedCount,
        isFinished: assignedCount > 0 && completedCount >= assignedCount
      };
    });

    // Загальний прогрес оцінювання
    const totalRequired = assessments.length;
    const totalCompleted = assessments.filter(a => a.isCompleted).length;

    // Проєкти без призначених суддів
    const unassignedCount = projects.filter(p => p.assignedJury.length === 0).length;

    res.status(200).json({
      projects,
      juryStats,
      totalProjects: projects.length,
      totalJury: juryMembers.length,
      unassignedCount,
      totalRequired,
      totalCompleted,
      progressPercent: totalRequired > 0 ? Math.round((totalCompleted / totalRequired) * 100) : 0
    });
  } catch (error) {
    console.error('Помилка статистики:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 2. Авторозподіл журі
exports.autoAssignJury = async (req, res) => {
  try {
    const { hackathonId } = req.params;
    const { reviewsPerProject = 2 } = req.body; // Скільки журі оцінює кожен проєкт
    const userId = req.userId;

    const { allowed, isMain } = await checkOrganizerAccess(hackathonId, userId);
    if (!allowed || !isMain) return res.status(403).json({ message: 'Тільки головний організатор може запустити авторозподіл' });

    const projects = await Project.find({ hackathonId });
    if (projects.length === 0) return res.status(400).json({ message: 'Немає здanih проєктів' });

    const juryMembers = await HackathonMember.find({
      hackathonId, role: 'Jury', status: 'Accepted'
    });
    if (juryMembers.length === 0) return res.status(400).json({ message: 'Немає журі на цьому хакатоні' });

    const juryIds = juryMembers.map(m => m.userId);
    const reviewsCount = Math.min(reviewsPerProject, juryIds.length);

    // Рівномірний розподіл — кожен проєкт отримує N суддів
    for (const project of projects) {
      // Перемішуємо журі щоразу для рівномірності
      const shuffled = [...juryIds].sort(() => Math.random() - 0.5);
      project.assignedJury = shuffled.slice(0, reviewsCount);
      await project.save();
    }

    res.status(200).json({
      message: `Авторозподіл завершено. Кожен проєкт призначено ${reviewsCount} суддям.`,
      projectsAssigned: projects.length
    });
  } catch (error) {
    console.error('Помилка авторозподілу:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 3. Ручне призначення судді до проєкту
exports.assignJuryToProject = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { juryUserId } = req.body;
    const userId = req.userId;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Проєкт не знайдено' });

    const { allowed } = await checkOrganizerAccess(project.hackathonId, userId);
    if (!allowed) return res.status(403).json({ message: 'Недостатньо прав' });

    // Перевіряємо чи цей юзер є журі
    const isJury = await HackathonMember.findOne({
      hackathonId: project.hackathonId,
      userId: juryUserId,
      role: 'Jury',
      status: 'Accepted'
    });
    if (!isJury) return res.status(400).json({ message: 'Цей користувач не є журі хакатону' });

    // Перевірка на дублікат
    if (project.assignedJury.some(j => j.toString() === juryUserId)) {
      return res.status(400).json({ message: 'Цей суддя вже призначений до проєкту' });
    }

    project.assignedJury.push(juryUserId);
    await project.save();

    res.status(200).json({ message: 'Суддю призначено до проєкту' });
  } catch (error) {
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 4. Видалення судді з проєкту
exports.removeJuryFromProject = async (req, res) => {
  try {
    const { projectId, juryId } = req.params;
    const userId = req.userId;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Проєкт не знайдено' });

    const { allowed } = await checkOrganizerAccess(project.hackathonId, userId);
    if (!allowed) return res.status(403).json({ message: 'Недостатньо прав' });

    project.assignedJury = project.assignedJury.filter(j => j.toString() !== juryId);
    await project.save();

    res.status(200).json({ message: 'Суддю видалено з проєкту' });
  } catch (error) {
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 5. Виставити оцінку (для журі)
exports.submitScore = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { innovationScore, technicalScore, presentationScore, comment } = req.body;
    const userId = req.userId;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Проєкт не знайдено' });

    // Перевірка чи є журі і призначений до цього проєкту
    const isJury = await HackathonMember.findOne({
      hackathonId: project.hackathonId,
      userId,
      role: 'Jury',
      status: 'Accepted'
    });
    if (!isJury) return res.status(403).json({ message: 'Ви не є журі цього хакатону' });

    // Стратегія А — якщо немає assignedJury, журі бачить всі проєкти
    const hasAssignment = project.assignedJury.length > 0;
    if (hasAssignment && !project.assignedJury.some(j => j.toString() === userId)) {
      return res.status(403).json({ message: 'Цей проєкт не призначений вам' });
    }

    // Валідація балів
    const scores = [innovationScore, technicalScore, presentationScore];
    if (scores.some(s => s < 0 || s > 10)) {
      return res.status(400).json({ message: 'Бали мають бути від 0 до 10' });
    }

    // Upsert оцінки
    const assessment = await Assessment.findOneAndUpdate(
      { userId, projectId },
      {
        userId, projectId,
        hackathonId: project.hackathonId,
        innovationScore, technicalScore, presentationScore,
        comment: comment || '',
        isCompleted: true,
        submittedAt: new Date()
      },
      { upsert: true, new: true }
    );

    res.status(200).json({ message: 'Оцінку виставлено', assessment });
  } catch (error) {
    console.error('Помилка виставлення оцінки:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 6. Отримати оцінки проєкту
exports.getProjectScores = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.userId;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Проєкт не знайдено' });

    const { allowed } = await checkOrganizerAccess(project.hackathonId, userId);
    if (!allowed) return res.status(403).json({ message: 'Недостатньо прав' });

    const assessments = await Assessment.find({ projectId })
      .populate('userId', 'name email avatar');

    const totalScore = assessments.length > 0
      ? assessments.reduce((acc, a) => acc + a.innovationScore + a.technicalScore + a.presentationScore, 0) / assessments.length
      : 0;

    res.status(200).json({ assessments, averageTotal: Math.round(totalScore * 10) / 10 });
  } catch (error) {
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// 7. Отримати проєкти призначені поточному журі
exports.getMyAssignedProjects = async (req, res) => {
  try {
    const { hackathonId } = req.params;
    const userId = req.userId;

    const isJury = await HackathonMember.findOne({
      hackathonId, userId, role: 'Jury', status: 'Accepted'
    });
    if (!isJury) return res.status(403).json({ message: 'Ви не є журі цього хакатону' });

    // Стратегія А — якщо немає розподілу, показуємо всі проєкти
    const assignedProjects = await Project.find({
      hackathonId,
      assignedJury: userId
    }).populate('teamId', 'name');

    if (assignedProjects.length === 0) {
      // Показуємо всі проєкти (Стратегія А)
      const allProjects = await Project.find({ hackathonId })
        .populate('teamId', 'name');

      const projectsWithScores = await Promise.all(
        allProjects.map(async p => {
          const myScore = await Assessment.findOne({ projectId: p._id, userId });
          return { ...p.toObject(), myScore, isAssigned: false };
        })
      );
      return res.status(200).json({ projects: projectsWithScores, isAutoMode: true });
    }

    const projectsWithScores = await Promise.all(
      assignedProjects.map(async p => {
        const myScore = await Assessment.findOne({ projectId: p._id, userId });
        return { ...p.toObject(), myScore, isAssigned: true };
      })
    );

    res.status(200).json({ projects: projectsWithScores, isAutoMode: false });
  } catch (error) {
    res.status(500).json({ message: 'Помилка сервера' });
  }
};