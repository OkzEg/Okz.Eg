const prisma = require('../lib/prisma');
const { sendError } = require('../utils/safeError');

const clampDiscount = (value) => {
  const n = Math.trunc(Number(value));
  if (!Number.isFinite(n) || n < 1 || n > 90) {
    const err = new Error('Discount must be between 1 and 90 percent');
    err.status = 400;
    throw err;
  }
  return n;
};

const listCoupons = async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(coupons);
  } catch (error) {
    return sendError(res, error);
  }
};

const createCoupon = async (req, res) => {
  try {
    const { code, discountPercentage, isActive } = req.body;
    if (!code || discountPercentage == null) {
      return res.status(400).json({ message: 'Code and discountPercentage required' });
    }
    const coupon = await prisma.coupon.create({
      data: {
        code: String(code).trim().toUpperCase().slice(0, 40),
        discountPercentage: clampDiscount(discountPercentage),
        isActive: isActive !== false,
      },
    });
    res.status(201).json(coupon);
  } catch (error) {
    return sendError(res, error, 'Could not create coupon');
  }
};

const updateCoupon = async (req, res) => {
  try {
    const data = {};
    if (req.body.code != null) data.code = String(req.body.code).trim().toUpperCase().slice(0, 40);
    if (req.body.discountPercentage != null) {
      data.discountPercentage = clampDiscount(req.body.discountPercentage);
    }
    if (req.body.isActive != null) data.isActive = Boolean(req.body.isActive);

    const coupon = await prisma.coupon.update({
      where: { id: req.params.id },
      data,
    });
    res.json(coupon);
  } catch (error) {
    return sendError(res, error, 'Could not update coupon');
  }
};

const deleteCoupon = async (req, res) => {
  try {
    await prisma.coupon.delete({ where: { id: req.params.id } });
    res.json({ message: 'Coupon deleted' });
  } catch (error) {
    return sendError(res, error, 'Could not delete coupon');
  }
};

const validateCoupon = async (req, res) => {
  try {
    const code = String(req.body.code || req.query.code || '')
      .trim()
      .toUpperCase()
      .slice(0, 40);
    if (!code) return res.status(400).json({ message: 'Coupon code required' });

    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.isActive) {
      return res.status(404).json({ message: 'Invalid coupon' });
    }
    res.json({
      code: coupon.code,
      discountPercentage: coupon.discountPercentage,
      isActive: coupon.isActive,
    });
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = { listCoupons, createCoupon, updateCoupon, deleteCoupon, validateCoupon };
