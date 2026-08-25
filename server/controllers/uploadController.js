const multer = require('multer');
const { uploadImage, isCloudinaryConfigured } = require('../utils/cloudinary');
const prisma = require('../lib/prisma');
const { sendError } = require('../utils/safeError');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const looksLikeImage = (buffer) => {
  if (!buffer || buffer.length < 12) return false;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return true;
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return true;
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return true;
  }
  return false;
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, WebP, or GIF images are allowed'));
    }
    return cb(null, true);
  },
});

const uploadSiteAsset = [
  upload.single('image'),
  async (req, res) => {
    try {
      if (!isCloudinaryConfigured()) {
        return res.status(503).json({
          message: 'Image upload is temporarily unavailable',
        });
      }
      if (!req.file && !req.body.imageData) {
        return res.status(400).json({ message: 'No image provided' });
      }

      let dataUri = req.body.imageData;
      if (req.file) {
        if (!looksLikeImage(req.file.buffer)) {
          return res.status(400).json({ message: 'File does not look like a valid image' });
        }
        const b64 = req.file.buffer.toString('base64');
        dataUri = `data:${req.file.mimetype};base64,${b64}`;
      } else if (!/^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(String(dataUri))) {
        return res.status(400).json({ message: 'Invalid image data' });
      }

      const folder = 'okz/site';
      const { url } = await uploadImage(dataUri, folder);

      if (req.body.key) {
        const key = String(req.body.key).trim().slice(0, 80);
        await prisma.siteAsset.upsert({
          where: { key },
          create: { key, cloudinaryUrl: url },
          update: { cloudinaryUrl: url },
        });
      }

      res.status(201).json({ url });
    } catch (error) {
      return sendError(res, error, 'Upload failed');
    }
  },
];

const uploadPaymentReceipt = [
  upload.single('image'),
  async (req, res) => {
    try {
      if (!isCloudinaryConfigured()) {
        return res.status(503).json({
          message: 'Receipt upload is temporarily unavailable',
        });
      }
      if (!req.file && !req.body.imageData) {
        return res.status(400).json({ message: 'No receipt image provided' });
      }

      let dataUri = req.body.imageData;
      if (req.file) {
        if (!looksLikeImage(req.file.buffer)) {
          return res.status(400).json({ message: 'Receipt must be a valid image' });
        }
        const b64 = req.file.buffer.toString('base64');
        dataUri = `data:${req.file.mimetype};base64,${b64}`;
      } else if (!/^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(String(dataUri))) {
        return res.status(400).json({ message: 'Receipt must be an image' });
      }

      const { url } = await uploadImage(dataUri, 'okz/receipts');
      res.status(201).json({ url });
    } catch (error) {
      return sendError(res, error, 'Receipt upload failed');
    }
  },
];

module.exports = { uploadSiteAsset, uploadPaymentReceipt };
