const Project = require('../models/Project');
const Team = require('../models/Team');
const Hackathon = require('../models/Hackathon');
const HackathonMember = require('../models/HackathonMember');

// Здати або оновити проєкт (Upsert)
exports.submitProject = async (req, res) => {
  try {
    const { teamId } = req.params;
    const { title, description, repoUrl, demoUrl, presentationUrl, videoUrl } = req.body;
    const userId = req.userId;

    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Команду не знайдено' });

    if (team.captainId.toString() !== userId) {
      return res.status(403).json({ message: 'Тільки капітан може здавати проєкт' });
    }

    const hackathon = await Hackathon.findById(team.hackathonId);
    if (!hackathon) return res.status(404).json({ message: 'Хакатон не знайдено' });

    const now = new Date();

    // Перевірка чи хакатон активний
    if (now < new Date(hackathon.startDate)) {
      return res.status(400).json({ message: 'Хакатон ще не почався' });
    }
    if (now > new Date(hackathon.endDate)) {
      return res.status(400).json({ message: 'Час здачі проєктів вийшов' });
    }

    if (!title?.trim()) return res.status(400).json({ message: 'Назва проєкту обов\'язкова' });
    if (!description?.trim()) return res.status(400).json({ message: 'Опис проєкту обов\'язковий' });

    const existingProject = await Project.findOne({ teamId });

    if (existingProject) {
      // Оновлюємо існуючий
      existingProject.title = title;
      existingProject.description = description;
      existingProject.repoUrl = repoUrl || '';
      existingProject.demoUrl = demoUrl || '';
      existingProject.presentationUrl = presentationUrl || '';
      existingProject.videoUrl = videoUrl || '';
      existingProject.lastUpdatedAt = now;
      await existingProject.save();

      return res.status(200).json({
        message: 'Проєкт успішно оновлено',
        project: existingProject,
        isNew: false
      });
    }

    // Створюємо новий
    const project = new Project({
      teamId,
      hackathonId: team.hackathonId,
      title,
      description,
      repoUrl: repoUrl || '',
      demoUrl: demoUrl || '',
      presentationUrl: presentationUrl || '',
      videoUrl: videoUrl || '',
    });
    await project.save();

    res.status(201).json({
      message: 'Проєкт успішно здано',
      project,
      isNew: true
    });
  } catch (error) {
    console.error('Помилка здачі проєкту:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// Отримати проєкт команди
exports.getProjectByTeam = async (req, res) => {
  try {
    const { teamId } = req.params;
    const project = await Project.findOne({ teamId });
    if (!project) return res.status(404).json({ message: 'Проєкт не знайдено' });
    res.status(200).json(project);
  } catch (error) {
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

// Отримати всі проєкти хакатону
exports.getHackathonProjects = async (req, res) => {
  try {
    const { hackathonId } = req.params;
    const userId = req.userId;

    const hackathon = await Hackathon.findById(hackathonId);
    if (!hackathon) return res.status(404).json({ message: 'Хакатон не знайдено' });

    // Перевірка чи організатор або со-організатор
    const isOrganizer = hackathon.organizerId.toString() === userId;
    const isCoOrg = await HackathonMember.findOne({
      hackathonId, userId, role: 'Co-organizer', status: 'Accepted'
    });

    if (!isOrganizer && !isCoOrg) {
      return res.status(403).json({ message: 'Недостатньо прав' });
    }

    const projects = await Project.find({ hackathonId })
      .populate('teamId', 'name captainId')
      .sort({ submittedAt: -1 });

    res.status(200).json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Помилка сервера' });
  }
};