const express = require('express');
const multer = require('multer');
const {
  listSlides,
  createSlide,
  updateSlide,
  deleteSlide,
  cloudinaryStatus,
} = require('../controllers/slideController');
const { protect, adminOnly, requireFreshStaff } = require('../middleware/authMiddleware');
const { searchLimiter } = require('../middleware/rateLimit');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
    }
  },
});

const handleUpload = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Invalid image upload' });
    }
    next();
  });
};

router.get('/', searchLimiter, listSlides);
router.get('/cloudinary-status', protect, requireFreshStaff, adminOnly, cloudinaryStatus);
router.post('/', protect, requireFreshStaff, adminOnly, handleUpload, createSlide);
router.put('/:id', protect, requireFreshStaff, adminOnly, handleUpload, updateSlide);
router.delete('/:id', protect, requireFreshStaff, adminOnly, deleteSlide);

module.exports = router;
