const Hackathon = require('../models/Hackathon');

const createHackathon = async (req, res) => {
  const { name, description, startDate, endDate, organizerId } = req.body;

  if (!organizerId) {
    return res.status(401).json({ message: 'Організатор не авторизований' });
  }

  try {
    const newHackathon = new Hackathon({
      name,
      description,
      startDate,
      endDate,
      organizer: organizerId
    });

    await newHackathon.save();
    res.status(201).json({ message: 'Хакатон успішно створено!' });
  } catch (error) {
    console.error('Помилка створення хакатону:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

const getHackathonsByOrganizer = async (req, res) => {
  const { organizerId } = req.query;

  try {
    const hacks = await Hackathon.find({ organizer: organizerId }).sort({ createdAt: -1 });
    res.json(hacks);
  } catch (error) {
    console.error('Помилка отримання хакатонів:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

module.exports = {
  createHackathon,
  getHackathonsByOrganizer
};
