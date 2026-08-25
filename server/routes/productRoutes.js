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
const { reviewLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.get('/', optionalProtect, listProducts);
router.post('/resolve-photos', protect, adminOnly, resolvePhotos);
router.get('/:id/reviews', listReviews);
router.post('/:id/reviews', protect, reviewLimiter, createReview);
router.delete('/:id/reviews/:reviewId', protect, deleteReview);
router.get('/:id', getProduct);
router.post('/', protect, adminOnly, createProduct);
router.put('/:id', protect, adminOnly, updateProduct);
router.patch('/:id/stock', protect, adminOnly, adjustStock);
router.delete('/:id', protect, adminOnly, deleteProduct);

module.exports = router;
