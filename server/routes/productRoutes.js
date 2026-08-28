const express = require('express');
const {
  listProducts,
  getProduct,
  resolvePhotos,
  createProduct,
  updateProduct,
  adjustStock,
  deleteProduct,
} = require('../controllers/productController');
const { listReviews, createReview, deleteReview } = require('../controllers/reviewController');
const { protect, adminOnly, optionalProtect } = require('../middleware/authMiddleware');
const { reviewLimiter, searchLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.get('/', optionalProtect, searchLimiter, listProducts);
router.post('/resolve-photos', protect, adminOnly, resolvePhotos);
router.get('/:id/reviews', listReviews);
router.post('/:id/reviews', optionalProtect, reviewLimiter, createReview);
router.delete('/:id/reviews/:reviewId', protect, deleteReview);
router.get('/:id', searchLimiter, getProduct);
router.post('/', protect, adminOnly, createProduct);
router.put('/:id', protect, adminOnly, updateProduct);
router.patch('/:id/stock', protect, adminOnly, adjustStock);
router.delete('/:id', protect, adminOnly, deleteProduct);

module.exports = router;
