const express = require('express');
const multer = require('multer');
const {
  listSlides,
  createSlide,
  updateSlide,
  deleteSlide,
  cloudinaryStatus,
} = require('../controllers/slideController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

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
router.get('/cloudinary-status', protect, adminOnly, cloudinaryStatus);
router.post('/', protect, adminOnly, handleUpload, createSlide);
router.put('/:id', protect, adminOnly, handleUpload, updateSlide);
router.delete('/:id', protect, adminOnly, deleteSlide);

module.exports = router;
