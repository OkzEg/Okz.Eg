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

router.get('/', listSlides);
router.get('/cloudinary-status', protect, adminOnly, cloudinaryStatus);
router.post('/', protect, adminOnly, upload.single('image'), createSlide);
router.put('/:id', protect, adminOnly, upload.single('image'), updateSlide);
router.delete('/:id', protect, adminOnly, deleteSlide);

module.exports = router;
