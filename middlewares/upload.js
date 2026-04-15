const multer = require('multer');
const path = require('path');

// Configuração de onde e como o ficheiro será guardado
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/products'); // Certifica-te que esta pasta existe
  },
  filename: function (req, file, cb) {
    // Gera um nome único: timestamp + extensão original
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Aceitar apenas imagens
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas são permitidas imagens!'), false);
    }
  }
});

module.exports = upload;