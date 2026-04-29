const Project = require('../models/Project');

const submitProject = async (req, res) => {
  const { title, description, repositoryLink, hackathonName, userId, teamId } = req.body;
  const uploadedFile = req.file ? req.file.filename : null;

  if (!userId) {
    return res.status(401).json({ message: 'Користувач не авторизований' });
  }

  try {
    const newProject = new Project({
      title,
      description,
      repositoryLink,
      hackathonName,
      submittedBy: userId,
      team: teamId,
      attachedFile: uploadedFile,
    });

    await newProject.save();
    res.status(201).json({ message: 'Проєкт з файлом успішно подано!' });
  } catch (error) {
    console.error('Помилка при подачі:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

const getProjectsByUser = async (req, res) => {
  const { userId } = req.query;

  if (!userId) return res.status(400).json({ message: 'Не передано userId' });

  try {
    const projects = await Project.find({ submittedBy: userId }).sort({ createdAt: -1 });
    res.json(projects);
  } catch (error) {
    console.error('Помилка отримання проєктів:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

module.exports = {
  submitProject,
  getProjectsByUser
};
