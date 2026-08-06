const prisma = require('../lib/prisma');

const listCoupons = async (req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(coupons);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
        code: code.toUpperCase(),
        discountPercentage: Number(discountPercentage),
        isActive: isActive !== false,
      },
    });
    res.status(201).json(coupon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCoupon = async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.code) data.code = data.code.toUpperCase();
    const coupon = await prisma.coupon.update({
      where: { id: req.params.id },
      data,
    });
    res.json(coupon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    await prisma.coupon.delete({ where: { id: req.params.id } });
    res.json({ message: 'Coupon deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const validateCoupon = async (req, res) => {
  try {
    const code = (req.body.code || req.query.code || '').toUpperCase();
    const coupon = await prisma.coupon.findUnique({ where: { code } });
    if (!coupon || !coupon.isActive) {
      return res.status(404).json({ message: 'Invalid coupon' });
    }
    res.json(coupon);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { listCoupons, createCoupon, updateCoupon, deleteCoupon, validateCoupon };
