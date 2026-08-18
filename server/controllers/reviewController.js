const prisma = require('../lib/prisma');

const serializeReview = (review) => ({
  id: review.id,
  rating: review.rating,
  comment: review.comment,
  createdAt: review.createdAt,
  user: {
    id: review.user?.id,
    name: review.user?.name || 'Customer',
  },
});

const summaryForProduct = async (productId) => {
  const agg = await prisma.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: { _all: true },
  });
    const count = agg._count._all || 0;
    const avg = agg._avg.rating;
    return {
      average: count && avg != null ? Number(avg.toFixed(1)) : 0,
      count,
    };
};

const listReviews = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const reviews = await prisma.review.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true } } },
    });

    const summary = await summaryForProduct(productId);
    res.set('Cache-Control', 'no-store');
    res.json({
      ...summary,
      reviews: reviews.map(serializeReview),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createReview = async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can leave reviews' });
    }

    const productId = req.params.id;
    const rating = Math.trunc(Number(req.body.rating));
    const comment = String(req.body.comment || '').trim();

    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }
    if (comment.length < 8) {
      return res.status(400).json({ message: 'Please write a short review (at least 8 characters)' });
    }
    if (comment.length > 1000) {
      return res.status(400).json({ message: 'Review is too long' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const existing = await prisma.review.findUnique({
      where: { productId_userId: { productId, userId: req.user.id } },
    });
    if (existing) {
      return res.status(400).json({ message: 'You already reviewed this product' });
    }

    const review = await prisma.review.create({
      data: {
        productId,
        userId: req.user.id,
        rating,
        comment,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    res.status(201).json(serializeReview(review));
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'You already reviewed this product' });
    }
    res.status(500).json({ message: error.message });
  }
};

const deleteReview = async (req, res) => {
  try {
    const review = await prisma.review.findUnique({
      where: { id: req.params.reviewId },
    });
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (review.productId !== req.params.id) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const isOwner = review.userId === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not allowed to delete this review' });
    }

    await prisma.review.delete({ where: { id: review.id } });
    res.json({ message: 'Review deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { listReviews, createReview, deleteReview };
