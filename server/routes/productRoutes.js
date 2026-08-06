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
const { protect, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', listProducts);
router.post('/resolve-photos', protect, adminOnly, resolvePhotos);
router.get('/:id', getProduct);
router.post('/', protect, adminOnly, createProduct);
router.put('/:id', protect, adminOnly, updateProduct);
router.patch('/:id/stock', protect, adminOnly, adjustStock);
router.delete('/:id', protect, adminOnly, deleteProduct);

module.exports = router;
