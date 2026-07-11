'use strict';
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './uploads');
const PROD_DIR = path.join(UPLOAD_DIR, 'productos');

// Asegura carpetas
fs.mkdirSync(PROD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PROD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const base = path.basename(file.originalname, ext)
      .replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(0, 40);
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const PERMITIDAS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif'];
const MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];

function fileFilter(_req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = (file.mimetype || '').toLowerCase();
  // Debe coincidir extensión permitida Y tipo MIME declarado de imagen.
  if (PERMITIDAS.includes(ext) && MIMES.includes(mime)) cb(null, true);
  else cb(new Error('Formato no permitido. Usa JPG, PNG, WEBP, AVIF o GIF.'));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024, files: 10 }, // 8MB c/u, hasta 10
});

module.exports = { upload, UPLOAD_DIR };
