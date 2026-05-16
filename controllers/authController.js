const User = require('../models/User');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const jwt = require('jsonwebtoken');
// const { Resend } = require('resend');
// const resend = new Resend(process.env.RESEND_API_KEY);

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_PASS,
  },
});

const registerUser = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Користувач з таким email вже існує' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      verificationToken,
    });

    await newUser.save();

    // Створюємо посилання для підтвердження (яке веде на фронтенд)
    const verificationUrl = `${process.env.FRONTEND_URL}/verify/${verificationToken}`;

    res.status(201).json({ message: 'Користувач зареєстрований. Лист відправлено.' });

    // Відправляємо лист
    const mailOptions = {
      from: `"Hackathon Face" <ab893d001@smtp-brevo.com>`,
      to: newUser.email,
      subject: 'Підтвердження реєстрації в Hackathon Face',
      html: `
        <h2>Вітаємо, ${newUser.name}!</h2>
        <p>Дякуємо за реєстрацію. Будь ласка, підтвердіть вашу електронну пошту, перейшовши за посиланням нижче:</p>
        <a href="${verificationUrl}" style="padding: 10px 20px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 5px;">Підтвердити пошту</a>
        <p>Якщо кнопка не працює, скопіюйте це посилання у браузер: <br/> ${verificationUrl}</p>
      `
    };

    transporter.sendMail(mailOptions)
      .then(() => console.log('Лист відправлено:', newUser.email))
      .catch(err => console.error('Помилка листа:', err.message));

  } catch (error) {
    console.error('Помилка реєстрації:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }

};

const verifyEmail = async (req, res) => {
  const { token } = req.params;

  try {
    // Шукаємо користувача з таким токеном
    const user = await User.findOne({ verificationToken: token });

    if (!user) {
      return res.status(400).json({ message: 'Недійсний токен або пошта вже підтверджена' });
    }

    // Оновлюємо статус і видаляємо токен
    user.status = 'Active';
    user.verificationToken = undefined;
    await user.save();

    res.status(200).json({ message: 'Пошту успішно підтверджено' });
  } catch (error) {
    console.error('Помилка підтвердження пошти:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Невірний email або пароль' });
    }

    if (user.status === 'Pending') {
      return res.status(403).json({ message: 'Будь ласка, підтвердіть вашу пошту перед входом' });
    }
    if (user.status === 'Blocked') {
      return res.status(403).json({ message: 'Ваш акаунт заблоковано' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Невірний email або пароль' });
    }

    if (user.authProvider !== 'local') {
      user.authProvider = 'local';
      await user.save();
    }

    const token = jwt.sign(
      { id: user._id, email: user.email }, 
      process.env.JWT_SECRET || 'fallback_secret_key', 
      { expiresIn: '1d' }
    );

    res.status(200).json({
      message: 'Вхід успішний',
      token: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        authProvider: user.authProvider || 'local'
      }
    });
  } catch (error) {
    console.error('Помилка логіну:', error);
    res.status(500).json({ message: 'Помилка сервера' });
  }
};

const googleAuth = async (req, res) => {
  const { token } = req.body;

  try {
    const googleResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!googleResponse.ok) {
      return res.status(400).json({ message: 'Недійсний токен Google' });
    }

    const googleUser = await googleResponse.json();
    const { email, name } = googleUser;

    let user = await User.findOne({ email });

    if (!user) {
      const crypto = require('crypto');
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = new User({
        name: name,
        email: email,
        password: hashedPassword,
        status: 'Active',
        authProvider: 'google',
      });

      await user.save();
    } else {
      if (user.status === 'Blocked') {
        return res.status(403).json({ message: 'Ваш акаунт заблоковано' });
      }
      if (user.status === 'Pending') {
        user.status = 'Active';
        user.verificationToken = undefined;
        await user.save();
      }
      if (user.authProvider !== 'google') {
        user.authProvider = 'google';
      }
      await user.save();
    }

    const jwtToken = jwt.sign(
      { id: user._id, email: user.email }, 
      process.env.JWT_SECRET || 'fallback_secret_key', 
      { expiresIn: '1d' }
    );

    res.status(200).json({
      message: 'Вхід через Google успішний',
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        authProvider: user.authProvider || 'google'
      }
    });

  } catch (error) {
    console.error('Помилка Google авторизації:', error);
    res.status(500).json({ message: 'Помилка сервера при вході через Google' });
  }
};

module.exports = { registerUser, loginUser, verifyEmail, googleAuth };
