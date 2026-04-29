const Team = require('../models/Team');
const User = require('../models/User');

const createTeam = async (req, res) => {
  const { name, hackathonId, userId } = req.body;

  try {
    const newTeam = new Team({
      name,
      hackathon: hackathonId,
      members: [userId],
      createdBy: userId
    });

    await newTeam.save();
    res.status(201).json({ message: 'Команду створено!', team: newTeam });
  } catch (error) {
    console.error('Помилка створення команди:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

const joinTeam = async (req, res) => {
  const { teamId, userId } = req.body;

  try {
    const team = await Team.findById(teamId);
    if (!team) return res.status(404).json({ message: 'Команду не знайдено' });

    if (team.members.includes(userId)) {
      return res.status(400).json({ message: 'Ви вже у команді' });
    }

    team.members.push(userId);
    await team.save();
    res.json({ message: 'Ви приєдналися до команди!' });
  } catch (error) {
    console.error('Помилка приєднання до команди:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

const getTeamByUser = async (req, res) => {
  const { userId } = req.query;

  try {
    const team = await Team.findOne({ members: userId }).populate('members', 'name email');
    if (!team) {
      return res.status(404).json({ message: 'Користувач не належить до жодної команди' });
    }

    res.json(team);
  } catch (error) {
    console.error('Помилка отримання команди:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

module.exports = {
  createTeam,
  joinTeam,
  getTeamByUser,
};
