const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
require('dotenv').config();

// 1. Налаштовуємо підключення до Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Створюємо сховище з динамічною логікою папок
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folderName = 'uploads/general'; // Папка за замовчуванням

    // Визначаємо папку на основі того, звідки йде запит і яке поле файлу
    if (req.baseUrl.includes('users') || req.baseUrl === '/api/users') {
      if (file.fieldname === 'avatar') folderName = 'uploads/users/avatars';
      if (file.fieldname === 'banner') folderName = 'uploads/users/banners';
    } else if (req.baseUrl.includes('hackathons') || req.baseUrl === '/api/hackathons') {
      if (file.fieldname === 'banner') folderName = 'uploads/hackathons/banners';
    }

    return {
      folder: folderName,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      // Cloudinary сам згенерує унікальне ім'я файлу
    };
  },
});

// 3. Створюємо мідлвар multer
const upload = multer({ storage: storage });

module.exports = upload;




{/* Код для збереження банерів та аватарок в папку через multer */}

// const multer = require('multer');
// const path = require('path');
// const fs = require('fs');

// const uploadDir = path.join(__dirname, '../uploads');
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir);
// }

// // Налаштовуємо місце збереження та імена файлів
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/');
//   },
//   filename: function (req, file, cb) {
//     cb(null, Date.now() + '-' + file.originalname);
//   }
// });

// const fileFilter = (req, file, cb) => {
//   if (file.mimetype.startsWith('image/')) {
//     cb(null, true);
//   } else {
//     cb(new Error('Можна завантажувати тільки зображення!'), false);
//   }
// };

// const upload = multer({ 
//   storage: storage,
//   fileFilter: fileFilter,
//   limits: { fileSize: 5 * 1024 * 1024 }
// });

// module.exports = upload;



{/* Код для файлу зберігання сертифікатів в папку */}

// const multer = require('multer');
// const path = require('path');

// // Налаштування зберігання
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads/'); // папка для зберігання
//   },
//   filename: (req, file, cb) => {
//     const uniqueName = Date.now() + '-' + file.originalname;
//     cb(null, uniqueName);
//   }
// });

// const upload = multer({ storage });

// module.exports = upload;
