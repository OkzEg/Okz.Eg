const multer = require('multer');
const prisma = require('../lib/prisma');
const { sendError } = require('../utils/safeError');
const { uploadImage, isCloudinaryConfigured } = require('../utils/cloudinary');

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_PHOTOS = 5;

const looksLikeImage = (buffer) => {
  if (!buffer || buffer.length < 12) return false;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true; // JPEG
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true; // PNG
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) return true; // WebP
  return false;
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, or WebP images are allowed'));
    }
    return cb(null, true);
  },
});

const serializeReview = (review) => ({
  id: review.id,
  rating: review.rating,
  comment: review.comment,
  photos: review.photos || [],
  status: review.status,
  createdAt: review.createdAt,
  guestName: review.guestName || null,
  user: review.user
    ? { id: review.user.id, name: review.user.name }
    : null,
  displayName: review.user?.name || review.guestName || 'Customer',
  product: review.product
    ? { id: review.product.id, name: review.product.name, photos: review.product.photos }
    : undefined,
  isVerifiedBuyer: review._verifiedBuyer || false,
});

const summaryForProduct = async (productId) => {
  const agg = await prisma.review.aggregate({
    where: { productId, status: 'approved' },
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

/* ── PUBLIC: list approved reviews for a product ── */
const listReviews = async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const reviews = await prisma.review.findMany({
      where: { productId, status: 'approved' },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true } } },
    });

    // Check verified buyer status for each review
    const enriched = await Promise.all(
      reviews.map(async (r) => {
        let isVerifiedBuyer = false;
        if (r.userId) {
          const deliveredOrder = await prisma.order.findFirst({
            where: {
              userId: r.userId,
              status: 'delivered',
              items: { some: { productId } },
            },
            select: { id: true },
          });
          isVerifiedBuyer = Boolean(deliveredOrder);
        }
        return { ...r, _verifiedBuyer: isVerifiedBuyer };
      })
    );

    const summary = await summaryForProduct(productId);
    res.set('Cache-Control', 'no-store');
    res.json({
      ...summary,
      reviews: enriched.map(serializeReview),
    });
  } catch (error) {
    return sendError(res, error);
  }
};

/* ── CUSTOMER: create a review (with optional photo uploads) ── */
const createReview = [
  upload.array('photos', MAX_PHOTOS),
  async (req, res) => {
    try {
      if (req.user && req.user.role !== 'customer') {
        return res.status(403).json({ message: 'Staff accounts cannot leave reviews' });
      }

      const productId = req.params.id;
      const rating = Math.trunc(Number(req.body.rating));
      const comment = String(req.body.comment || '').trim();
      const guestName = String(req.body.guestName || req.body.name || '').trim().slice(0, 80);

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

      let userId = null;
      if (req.user?.id) {
        userId = req.user.id;
        const existing = await prisma.review.findUnique({
          where: { productId_userId: { productId, userId } },
        });
        if (existing) {
          return res.status(400).json({ message: 'You already reviewed this product' });
        }
      } else if (!guestName || guestName.length < 2) {
        return res.status(400).json({ message: 'Name is required' });
      }

      // Upload photos to Cloudinary
      const photoUrls = [];
      if (req.files && req.files.length > 0 && isCloudinaryConfigured()) {
        for (const file of req.files) {
          if (!looksLikeImage(file.buffer)) {
            return res.status(400).json({ message: 'One of your files is not a valid image' });
          }
          const b64 = file.buffer.toString('base64');
          const dataUri = `data:${file.mimetype};base64,${b64}`;
          const { url } = await uploadImage(dataUri, 'okz/reviews');
          photoUrls.push(url);
        }
      }

      const review = await prisma.review.create({
        data: {
          productId,
          userId,
          guestName: userId ? null : guestName,
          rating,
          comment,
          photos: photoUrls,
          status: 'pending',
        },
        include: { user: { select: { id: true, name: true } } },
      });

      res.status(201).json({
        ...serializeReview(review),
        message: 'Thank you! Your review is pending approval.',
      });
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(400).json({ message: 'You already reviewed this product' });
      }
      return sendError(res, error, 'Could not save review');
    }
  },
];

/* ── ADMIN: list all pending reviews ── */
const listPendingReviews = async (req, res) => {
  try {
    const status = req.query.status || 'pending';
    const validStatuses = ['pending', 'approved', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status filter' });
    }

    const reviews = await prisma.review.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, name: true, photos: true } },
      },
    });

    const counts = await prisma.review.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    const countMap = {};
    for (const c of counts) {
      countMap[c.status] = c._count._all;
    }

    res.json({
      reviews: reviews.map(serializeReview),
      counts: {
        pending: countMap.pending || 0,
        approved: countMap.approved || 0,
        rejected: countMap.rejected || 0,
      },
    });
  } catch (error) {
    return sendError(res, error);
  }
};

/* ── ADMIN: moderate a review (approve/reject) ── */
const moderateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Status must be approved or rejected' });
    }

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) return res.status(404).json({ message: 'Review not found' });

    const updated = await prisma.review.update({
      where: { id },
      data: { status },
      include: {
        user: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, photos: true } },
      },
    });

    res.json(serializeReview(updated));
  } catch (error) {
    return sendError(res, error);
  }
};

/* ── DELETE a review (owner or admin) ── */
const deleteReview = async (req, res) => {
  try {
    const review = await prisma.review.findUnique({
      where: { id: req.params.reviewId },
    });
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (review.productId !== req.params.id) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const isOwner = review.userId && review.userId === req.user.id;
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not allowed to delete this review' });
    }

    await prisma.review.delete({ where: { id: review.id } });
    res.json({ message: 'Review deleted' });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = { listReviews, createReview, deleteReview, listPendingReviews, moderateReview };
