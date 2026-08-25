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

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

const handleUpload = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Invalid image upload' });
    }
    next();
  });
};

router.get('/', listSlides);
router.get('/cloudinary-status', protect, requireFreshStaff, adminOnly, cloudinaryStatus);
router.post('/', protect, requireFreshStaff, adminOnly, handleUpload, createSlide);
router.put('/:id', protect, requireFreshStaff, adminOnly, handleUpload, updateSlide);
router.delete('/:id', protect, requireFreshStaff, adminOnly, deleteSlide);

module.exports = router;
