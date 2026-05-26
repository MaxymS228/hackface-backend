require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const User = require('./models/User');
const Hackathon = require('./models/Hackathon');
const HackathonMember = require('./models/HackathonMember');
const Team = require('./models/Team');
const Task = require('./models/Task');
const TaskScore = require('./models/TaskScore');
const Project = require('./models/Project');
const Message = require('./models/Message');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Підключено до MongoDB');

  // Очищення
  await Promise.all([
    User.deleteMany({ email: /@test\.com$/ }),
    Hackathon.deleteMany({ title: /\[TEST\]/ }),
    Message.deleteMany({}),
  ]);
  console.log('Старі тестові дані видалено');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Користувачі
  const organizer = await User.create({ name: 'Організатор Тест', email: 'organizer@test.com', password: hashedPassword, status: 'Active', specialization: 'Product Manager', bio: 'Організовую хакатони для спільноти розробників', skills: ['Product Management', 'Agile', 'UI/UX'] });
  const jury1 = await User.create({ name: 'Журі Перший', email: 'jury1@test.com', password: hashedPassword, status: 'Active', specialization: 'Senior Developer', skills: ['React', 'Node.js', 'MongoDB'] });
  const jury2 = await User.create({ name: 'Журі Другий', email: 'jury2@test.com', password: hashedPassword, status: 'Active', specialization: 'Tech Lead', skills: ['Python', 'ML', 'Docker'] });
  const captain1 = await User.create({ name: 'Капітан Альфа', email: 'captain1@test.com', password: hashedPassword, status: 'Active', specialization: 'Full-Stack Developer', bio: 'Люблю створювати AI продукти', skills: ['React', 'Python', 'TensorFlow'] });
  const captain2 = await User.create({ name: 'Капітан Бета', email: 'captain2@test.com', password: hashedPassword, status: 'Active', specialization: 'Blockchain Developer', skills: ['Solidity', 'Web3.js', 'Ethereum'] });
  const captain3 = await User.create({ name: 'Капітан Гамма', email: 'captain3@test.com', password: hashedPassword, status: 'Active', specialization: 'Mobile Developer', skills: ['React Native', 'Flutter', 'Firebase'] });
  const member1 = await User.create({ name: 'Учасник Один', email: 'member1@test.com', password: hashedPassword, status: 'Active', specialization: 'Frontend Developer', skills: ['Vue.js', 'TypeScript', 'CSS'] });
  const member2 = await User.create({ name: 'Учасник Два', email: 'member2@test.com', password: hashedPassword, status: 'Active', specialization: 'UI/UX Designer', skills: ['Figma', 'Adobe XD', 'Prototyping'] });

  console.log('Користувачів створено');

  const now = new Date();

  // Хакатон 1 — Завершений (з результатами і оцінками)
  const hackCompleted = await Hackathon.create({
    title: '[TEST] AI Innovation Hackathon 2026',
    description: 'Перший тестовий хакатон присвячений штучному інтелекту та машинному навчанню. Учасники розробляли AI-рішення для реальних проблем.',
    organizerId: organizer._id,
    startDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    endDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    registrationDeadline: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
    format: 'Online', themes: ['AI', 'ML', 'Data Science'],
    prizes: '1 місце — $2000, 2 місце — $1000, 3 місце — $500',
    minTeamSize: 2, maxTeamSize: 4, allowSolo: false,
  });

  await HackathonMember.create([
    { userId: organizer._id, hackathonId: hackCompleted._id, role: 'Organizer', status: 'Accepted' },
    { userId: jury1._id, hackathonId: hackCompleted._id, role: 'Jury', status: 'Accepted' },
    { userId: jury2._id, hackathonId: hackCompleted._id, role: 'Jury', status: 'Accepted' },
    { userId: captain1._id, hackathonId: hackCompleted._id, role: 'Participant', status: 'Accepted' },
    { userId: captain2._id, hackathonId: hackCompleted._id, role: 'Participant', status: 'Accepted' },
    { userId: captain3._id, hackathonId: hackCompleted._id, role: 'Participant', status: 'Accepted' },
    { userId: member1._id, hackathonId: hackCompleted._id, role: 'Participant', status: 'Accepted' },
    { userId: member2._id, hackathonId: hackCompleted._id, role: 'Participant', status: 'Accepted' },
  ]);

  const cTeam1 = await Team.create({ name: 'NeuralNinjas', hackathonId: hackCompleted._id, captainId: captain1._id, description: 'AI асистент для медичної діагностики', isOpen: false });
  const cTeam2 = await Team.create({ name: 'DataDragons', hackathonId: hackCompleted._id, captainId: captain2._id, description: 'Предиктивна аналітика для фінансів', isOpen: false });
  const cTeam3 = await Team.create({ name: 'CodeCrafters', hackathonId: hackCompleted._id, captainId: captain3._id, description: 'NLP система для автоматизації документів', isOpen: false });

  const cMembers = await HackathonMember.find({ hackathonId: hackCompleted._id, role: 'Participant', status: 'Accepted' });
  await HackathonMember.findByIdAndUpdate(cMembers.find(m => m.userId.toString() === captain1._id.toString())._id, { teamId: cTeam1._id, teamRole: 'Captain' });
  await HackathonMember.findByIdAndUpdate(cMembers.find(m => m.userId.toString() === captain2._id.toString())._id, { teamId: cTeam2._id, teamRole: 'Captain' });
  await HackathonMember.findByIdAndUpdate(cMembers.find(m => m.userId.toString() === captain3._id.toString())._id, { teamId: cTeam3._id, teamRole: 'Captain' });
  await HackathonMember.findByIdAndUpdate(cMembers.find(m => m.userId.toString() === member1._id.toString())._id, { teamId: cTeam1._id, teamRole: 'Member' });
  await HackathonMember.findByIdAndUpdate(cMembers.find(m => m.userId.toString() === member2._id.toString())._id, { teamId: cTeam2._id, teamRole: 'Member' });

  const cTask1 = await Task.create({ hackathonId: hackCompleted._id, title: 'Концепція рішення', stage: 1, description: 'Опишіть AI рішення та яку проблему воно вирішує.', criteria: [{ name: 'Актуальність', maxScore: 10 }, { name: 'Інноваційність', maxScore: 10 }, { name: 'Ринковий потенціал', maxScore: 10 }], isVisible: true });
  const cTask2 = await Task.create({ hackathonId: hackCompleted._id, title: 'Технічна реалізація', stage: 2, description: 'Покажіть робочу модель або прототип AI системи.', criteria: [{ name: 'Якість моделі', maxScore: 20 }, { name: 'Точність', maxScore: 15 }, { name: 'Масштабованість', maxScore: 15 }], isVisible: true });
  const cTask3 = await Task.create({ hackathonId: hackCompleted._id, title: 'Фінальна демонстрація', stage: 3, description: 'Фінальна презентація продукту журі.', criteria: [{ name: 'Якість продукту', maxScore: 20 }, { name: 'Презентація', maxScore: 15 }, { name: 'Бізнес модель', maxScore: 15 }], isVisible: true });

  await Project.create([
    { teamId: cTeam1._id, hackathonId: hackCompleted._id, title: 'MediAI', description: 'AI система для ранньої діагностики захворювань за симптомами.', repoUrl: 'https://github.com/demo/mediai', demoUrl: 'https://mediai.demo.app' },
    { teamId: cTeam2._id, hackathonId: hackCompleted._id, title: 'FinPredict', description: 'ML модель для прогнозування фінансових ринків.', repoUrl: 'https://github.com/demo/finpredict', demoUrl: 'https://finpredict.demo.app' },
    { teamId: cTeam3._id, hackathonId: hackCompleted._id, title: 'DocuBot', description: 'NLP бот для автоматичної обробки юридичних документів.', repoUrl: 'https://github.com/demo/docubot' },
  ]);

  // Оцінки — Team1 перше, Team2 друге, Team3 третє
  const completedScores = [
    { task: cTask1._id, teams: [{ t: cTeam1._id, j1: [10,9,9], j2: [9,10,8] }, { t: cTeam2._id, j1: [8,7,8], j2: [7,8,7] }, { t: cTeam3._id, j1: [7,7,6], j2: [6,7,7] }] },
    { task: cTask2._id, teams: [{ t: cTeam1._id, j1: [19,14,13], j2: [18,13,12] }, { t: cTeam2._id, j1: [16,12,12], j2: [15,11,11] }, { t: cTeam3._id, j1: [14,10,10], j2: [13,9,9] }] },
    { task: cTask3._id, teams: [{ t: cTeam1._id, j1: [19,14,13], j2: [18,13,14] }, { t: cTeam2._id, j1: [17,12,13], j2: [16,11,12] }, { t: cTeam3._id, j1: [15,10,11], j2: [14,9,10] }] },
  ];

  for (const taskData of completedScores) {
    const task = await Task.findById(taskData.task);
    for (const teamData of taskData.teams) {
      const s1 = taskData.task === cTask1._id
        ? task.criteria.map((c, i) => ({ criterionName: c.name, score: teamData.j1[i] }))
        : task.criteria.map((c, i) => ({ criterionName: c.name, score: teamData.j1[i] }));
      await TaskScore.create({ taskId: taskData.task, teamId: teamData.t, juryId: jury1._id, hackathonId: hackCompleted._id, scores: task.criteria.map((c, i) => ({ criterionName: c.name, score: teamData.j1[i] })), totalScore: teamData.j1.reduce((a, b) => a + b, 0) });
      await TaskScore.create({ taskId: taskData.task, teamId: teamData.t, juryId: jury2._id, hackathonId: hackCompleted._id, scores: task.criteria.map((c, i) => ({ criterionName: c.name, score: teamData.j2[i] })), totalScore: teamData.j2.reduce((a, b) => a + b, 0) });
    }
  }

  console.log('Завершений хакатон створено з оцінками');

  // Хакатон 2 — Активний (проходить зараз)
  const hackOngoing = await Hackathon.create({
    title: '[TEST] HackFace Demo 2026',
    description: 'Активний тестовий хакатон. Команди зараз розробляють свої рішення. Можна бачити завдання, чат та здавати проєкти.',
    organizerId: organizer._id,
    startDate: new Date(now.getTime() - 2 * 60 * 60 * 1000),
    endDate: new Date(now.getTime() + 22 * 60 * 60 * 1000),
    registrationDeadline: new Date(now.getTime() - 3 * 60 * 60 * 1000),
    format: 'Hybrid', location: 'м. Київ, вул. Хрещатик, 1 (HUB)',
    themes: ['Web3', 'FinTech', 'GreenTech'],
    prizes: '1 місце — MacBook Pro, 2 місце — iPad, 3 місце — AirPods',
    minTeamSize: 2, maxTeamSize: 4, allowSolo: false,
  });

  await HackathonMember.create([
    { userId: organizer._id, hackathonId: hackOngoing._id, role: 'Organizer', status: 'Accepted' },
    { userId: jury1._id, hackathonId: hackOngoing._id, role: 'Jury', status: 'Accepted' },
    { userId: jury2._id, hackathonId: hackOngoing._id, role: 'Jury', status: 'Accepted' },
    { userId: captain1._id, hackathonId: hackOngoing._id, role: 'Participant', status: 'Accepted' },
    { userId: captain2._id, hackathonId: hackOngoing._id, role: 'Participant', status: 'Accepted' },
    { userId: captain3._id, hackathonId: hackOngoing._id, role: 'Participant', status: 'Accepted' },
    { userId: member1._id, hackathonId: hackOngoing._id, role: 'Participant', status: 'Accepted' },
    { userId: member2._id, hackathonId: hackOngoing._id, role: 'Participant', status: 'Accepted' },
  ]);

  const oTeam1 = await Team.create({ name: 'Team Alpha', hackathonId: hackOngoing._id, captainId: captain1._id, description: 'AI асистент для студентів', projectIdea: 'StudyBot — розумний помічник для навчання', lookingFor: ['Design'], isOpen: false });
  const oTeam2 = await Team.create({ name: 'Team Beta', hackathonId: hackOngoing._id, captainId: captain2._id, description: 'Блокчейн для голосування', isOpen: false });
  const oTeam3 = await Team.create({ name: 'Team Gamma', hackathonId: hackOngoing._id, captainId: captain3._id, description: 'FinTech мобільний додаток', isOpen: true, lookingFor: ['Backend', 'ML'] });

  const oMembers = await HackathonMember.find({ hackathonId: hackOngoing._id, role: 'Participant', status: 'Accepted' });
  await HackathonMember.findByIdAndUpdate(oMembers.find(m => m.userId.toString() === captain1._id.toString())._id, { teamId: oTeam1._id, teamRole: 'Captain' });
  await HackathonMember.findByIdAndUpdate(oMembers.find(m => m.userId.toString() === captain2._id.toString())._id, { teamId: oTeam2._id, teamRole: 'Captain' });
  await HackathonMember.findByIdAndUpdate(oMembers.find(m => m.userId.toString() === captain3._id.toString())._id, { teamId: oTeam3._id, teamRole: 'Captain' });
  await HackathonMember.findByIdAndUpdate(oMembers.find(m => m.userId.toString() === member1._id.toString())._id, { teamId: oTeam1._id, teamRole: 'Member' });
  await HackathonMember.findByIdAndUpdate(oMembers.find(m => m.userId.toString() === member2._id.toString())._id, { teamId: oTeam2._id, teamRole: 'Member' });

  await Task.create([
    { hackathonId: hackOngoing._id, title: 'Пітч ідеї', stage: 1, description: 'Презентуйте вашу ідею.', criteria: [{ name: 'Актуальність проблеми', maxScore: 10 }, { name: 'Чіткість ідеї', maxScore: 10 }, { name: 'Ринковий потенціал', maxScore: 10 }], isVisible: true },
    { hackathonId: hackOngoing._id, title: 'Технічний прототип', stage: 2, description: 'Покажіть робочий прототип.', criteria: [{ name: 'Технічна реалізація', maxScore: 15 }, { name: 'Якість коду', maxScore: 10 }, { name: 'Функціональність', maxScore: 15 }], isVisible: true },
    { hackathonId: hackOngoing._id, title: 'Фінальна презентація', stage: 3, description: 'Фінальна демонстрація проєкту.', criteria: [{ name: 'Якість продукту', maxScore: 20 }, { name: 'Презентація та подача', maxScore: 15 }, { name: 'Бізнес модель', maxScore: 15 }], isVisible: false },
  ]);

  await Project.create([
    { teamId: oTeam1._id, hackathonId: hackOngoing._id, title: 'StudyBot AI', description: 'AI навчальний асистент для студентів.', repoUrl: 'https://github.com/demo/studybot', demoUrl: 'https://studybot.demo.app', presentationUrl: 'https://figma.com/demo/studybot' },
    { teamId: oTeam2._id, hackathonId: hackOngoing._id, title: 'VoteChain', description: 'Децентралізована платформа для голосування.', repoUrl: 'https://github.com/demo/votechain' },
  ]);

  // Повідомлення в загальному чаті
  await Message.create([
    { hackathonId: hackOngoing._id, teamId: null, senderId: captain1._id, senderName: 'Капітан Альфа', text: 'Всім привіт! Хто вже почав розробку?' },
    { hackathonId: hackOngoing._id, teamId: null, senderId: captain2._id, senderName: 'Капітан Бета', text: 'Ми вже написали 200 рядків коду 😄' },
    { hackathonId: hackOngoing._id, teamId: null, senderId: member1._id, senderName: 'Учасник Один', text: 'Хтось може порадити бібліотеку для ML на Python?' },
    { hackathonId: hackOngoing._id, teamId: null, senderId: jury1._id, senderName: 'Журі Перший', text: 'Нагадую — дедлайн першого завдання через 4 години!' },
  ]);

  console.log('Активний хакатон створено');

  // Хакатон 3 — Майбутній
  const hackUpcoming = await Hackathon.create({
    title: '[TEST] GreenTech Challenge 2026',
    description: 'Хакатон присвячений екологічним технологіям та сталому розвитку. Розробляйте рішення для боротьби з кліматичними змінами, оптимізації енергоспоживання та управління відходами.',
    organizerId: organizer._id,
    startDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000),
    endDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
    registrationDeadline: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
    format: 'Offline', location: 'м. Львів, вул. Університетська, 1',
    themes: ['GreenTech', 'CleanEnergy', 'Sustainability', 'IoT'],
    prizes: '1 місце — $3000 + менторство, 2 місце — $1500, 3 місце — $750',
    minTeamSize: 2, maxTeamSize: 5, allowSolo: false,
  });

  await HackathonMember.create([
    { userId: organizer._id, hackathonId: hackUpcoming._id, role: 'Organizer', status: 'Accepted' },
    { userId: jury1._id, hackathonId: hackUpcoming._id, role: 'Jury', status: 'Accepted' },
    { userId: captain1._id, hackathonId: hackUpcoming._id, role: 'Participant', status: 'Accepted' },
  ]);

  console.log('Майбутній хакатон створено');
  console.log('\nSeed завершено успішно!');
  console.log('\nТестові акаунти (пароль: password123):');
  console.log('  organizer@test.com — Організатор');
  console.log('  jury1@test.com     — Журі');
  console.log('  jury2@test.com     — Журі');
  console.log('  captain1@test.com  — Капітан (в обох хакатонах)');
  console.log('  captain2@test.com  — Капітан');
  console.log('  captain3@test.com  — Капітан');
  console.log('  member1@test.com   — Учасник');
  console.log('  member2@test.com   — Учасник');
  console.log(`\nХакатони:`);
  console.log(`  Завершений: ${hackCompleted._id}`);
  console.log(`  Активний:   ${hackOngoing._id}`);
  console.log(`  Майбутній:  ${hackUpcoming._id}`);

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(err => {
  console.error('Помилка seed:', err);
  process.exit(1);
});