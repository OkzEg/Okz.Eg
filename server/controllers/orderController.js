const prisma = require('../lib/prisma');
const cache = require('../lib/cache');

const effectivePrice = (product) => {
  if (product.isSaleActive && product.salePrice != null) {
    return Number(product.salePrice);
  }
  return Number(product.price);
};

const createOrder = async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can place orders' });
    }

    const { orderItems, paymentMethod, shippingAddress, couponCode } = req.body;
    if (!orderItems?.length) {
      return res.status(400).json({ message: 'No order items' });
    }
    if (!paymentMethod || !shippingAddress) {
      return res.status(400).json({ message: 'Payment method and shipping address required' });
    }

    const productIds = orderItems.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const byId = Object.fromEntries(products.map((p) => [p.id, p]));

    let itemsPrice = 0;
    const itemsData = [];

    for (const item of orderItems) {
      const product = byId[item.productId];
      if (!product) {
        return res.status(400).json({ message: `Product not found: ${item.productId}` });
      }
      const qty = Number(item.qty) || 0;
      if (qty < 1) {
        return res.status(400).json({ message: `Invalid quantity for ${product.name}` });
      }
      if (product.stock < qty) {
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }
      const price = effectivePrice(product);
      itemsPrice += price * qty;
      itemsData.push({
        productId: product.id,
        name: product.name,
        qty,
        image: product.photos[0] || '',
        price,
        color: item.color || null,
        size: item.size || null,
      });
    }

    let discountAmount = 0;
    let couponId = null;
    let savedCouponCode = null;
    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: couponCode.toUpperCase() },
      });
      if (!coupon || !coupon.isActive) {
        return res.status(400).json({ message: 'Invalid coupon' });
      }
      discountAmount = (itemsPrice * coupon.discountPercentage) / 100;
      couponId = coupon.id;
      savedCouponCode = coupon.code;
    }

    const shippingPrice = itemsPrice >= 2000 ? 0 : 75;
    const totalPrice = Math.max(0, itemsPrice + shippingPrice - discountAmount);

    const order = await prisma.$transaction(async (tx) => {
      for (const item of itemsData) {
        // Atomic deduct — fails if stock was taken by another order
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.qty } },
          data: { stock: { decrement: item.qty } },
        });
        if (updated.count === 0) {
          throw new Error(`Insufficient stock for ${item.name}`);
        }
      }

      return tx.order.create({
        data: {
          userId: req.user.id,
          paymentMethod,
          shippingAddress,
          itemsPrice,
          shippingPrice,
          discountAmount,
          totalPrice,
          couponId,
          couponCode: savedCouponCode,
          items: { create: itemsData },
        },
        include: {
          items: true,
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      });
    });

    cache.invalidate('products');
    cache.invalidate('product');

    res.status(201).json(serializeOrder(order));
  } catch (error) {
    if (error.message?.startsWith('Insufficient stock')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

const serializeOrder = (order) => ({
  ...order,
  itemsPrice: Number(order.itemsPrice),
  shippingPrice: Number(order.shippingPrice),
  discountAmount: Number(order.discountAmount),
  totalPrice: Number(order.totalPrice),
  items: order.items?.map((i) => ({ ...i, price: Number(i.price) })),
});

const myOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders.map(serializeOrder));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getOrder = async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
        problems: true,
      },
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const isOwner = order.userId === req.user.id;
    const isStaff = ['admin', 'ops'].includes(req.user.role);
    if (!isOwner && !isStaff) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    res.json(serializeOrder(order));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const listOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const orders = await prisma.order.findMany({
      where: status ? { status } : undefined,
      include: {
        items: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders.map(serializeOrder));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = [
      'pending',
      'confirmed',
      'out_for_delivery',
      'delivered',
      'canceled',
      'problem',
    ];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const data = { status };
    if (status === 'delivered') {
      data.deliveredAt = new Date();
      data.isPaid = true;
      data.paidAt = new Date();
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data,
      include: {
        items: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
    res.json(serializeOrder(order));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const existing = await prisma.order.findUnique({
      where: { id: req.params.id },
      select: { id: true },
    });
    if (!existing) return res.status(404).json({ message: 'Order not found' });

    await prisma.$transaction(async (tx) => {
      await tx.problemRequest.deleteMany({ where: { orderId: req.params.id } });
      await tx.orderItem.deleteMany({ where: { orderId: req.params.id } });
      await tx.order.delete({ where: { id: req.params.id } });
    });

    res.json({ message: 'Order deleted', id: req.params.id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const financeSummary = async (req, res) => {
  try {
    const { from, to } = req.query;
    const createdAt = {};
    if (from) createdAt.gte = new Date(from);
    if (to) createdAt.lte = new Date(to);

    const where = {
      status: { not: 'canceled' },
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
    };

    const orders = await prisma.order.findMany({
      where,
      include: { items: true },
    });

    const revenue = orders.reduce((sum, o) => sum + Number(o.totalPrice), 0);
    const paid = orders.filter((o) => o.isPaid).reduce((sum, o) => sum + Number(o.totalPrice), 0);
    const byStatus = orders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});

    const lowStock = await prisma.product.findMany({
      where: { stock: { lte: 5 } },
      orderBy: { stock: 'asc' },
      take: 10,
    });

    res.json({
      orderCount: orders.length,
      revenue,
      paid,
      byStatus,
      lowStock: lowStock.map((p) => ({
        ...p,
        price: Number(p.price),
        salePrice: p.salePrice != null ? Number(p.salePrice) : null,
      })),
      recentOrders: orders.slice(0, 10).map(serializeOrder),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrder,
  myOrders,
  getOrder,
  listOrders,
  updateOrderStatus,
  deleteOrder,
  financeSummary,
};
