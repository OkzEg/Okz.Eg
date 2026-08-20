const prisma = require('../lib/prisma');
const cache = require('../lib/cache');
const { getAvailableStock } = require('./productController');
const { uploadImage, isCloudinaryConfigured } = require('../utils/cloudinary');
const { queueOrderConfirmationEmail } = require('../utils/mail');

const FREE_SHIPPING_MIN = 3000;
const SHIPPING_FEE_CAIRO_GIZA = 80;
const SHIPPING_FEE_OTHER = 110;
const DIGITAL_PAYMENT_METHODS = new Set(['InstaPay', 'Online Wallet', 'Vodafone Cash']);

const normalizePhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits || '';
};

const effectivePrice = (product) => {
  if (product.isSaleActive && product.salePrice != null) {
    return Number(product.salePrice);
  }
  return Number(product.price);
};

const requireShippingAddress = (shippingAddress) => {
  if (!shippingAddress) {
    const err = new Error('Payment method and shipping address required');
    err.status = 400;
    throw err;
  }
  if (!String(shippingAddress.street || '').trim() || !String(shippingAddress.city || '').trim()) {
    const err = new Error('Street and city are required');
    err.status = 400;
    throw err;
  }
  if (!String(shippingAddress.state || '').trim()) {
    const err = new Error('Governorate is required');
    err.status = 400;
    throw err;
  }
};

const shippingFeeForGovernorate = (governorate) => {
  const value = String(governorate || '').trim().toLowerCase();
  if (value === 'cairo' || value === 'giza') return SHIPPING_FEE_CAIRO_GIZA;
  return SHIPPING_FEE_OTHER;
};

const calcShipping = (itemsPrice, governorate) => {
  if (Number(itemsPrice) >= FREE_SHIPPING_MIN) return 0;
  return shippingFeeForGovernorate(governorate);
};

const buildOrderItems = async (orderItems) => {
  if (!orderItems?.length) {
    const err = new Error('No order items');
    err.status = 400;
    throw err;
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
      const err = new Error(`Product not found: ${item.productId}`);
      err.status = 400;
      throw err;
    }
    const qty = Number(item.qty) || 0;
    if (qty < 1) {
      const err = new Error(`Invalid quantity for ${product.name}`);
      err.status = 400;
      throw err;
    }
    if (product.sizes?.length && !item.size) {
      const err = new Error(`Select a size for ${product.name}`);
      err.status = 400;
      throw err;
    }
    const available = getAvailableStock(product, item.size);
    if (available < qty) {
      const sizeLabel = item.size ? ` (size ${item.size})` : '';
      const err = new Error(`Insufficient stock for ${product.name}${sizeLabel}`);
      err.status = 400;
      throw err;
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

  return { itemsPrice, itemsData };
};

const resolveCoupon = async (couponCode, itemsPrice) => {
  let discountAmount = 0;
  let couponId = null;
  let savedCouponCode = null;
  if (!couponCode) {
    return { discountAmount, couponId, savedCouponCode };
  }

  const coupon = await prisma.coupon.findUnique({
    where: { code: String(couponCode).toUpperCase() },
  });
  if (!coupon || !coupon.isActive) {
    const err = new Error('Invalid coupon');
    err.status = 400;
    throw err;
  }
  discountAmount = (itemsPrice * coupon.discountPercentage) / 100;
  couponId = coupon.id;
  savedCouponCode = coupon.code;
  return { discountAmount, couponId, savedCouponCode };
};

const requiresPaymentReceipt = (paymentMethod) =>
  DIGITAL_PAYMENT_METHODS.has(String(paymentMethod || '').trim());

const resolvePaymentReceiptUrl = async ({ paymentMethod, paymentReceiptUrl, paymentReceiptData }) => {
  if (!requiresPaymentReceipt(paymentMethod)) {
    return null;
  }

  let url = String(paymentReceiptUrl || '').trim();
  if (!url && paymentReceiptData) {
    if (!isCloudinaryConfigured()) {
      const err = new Error('Payment receipt upload is temporarily unavailable');
      err.status = 503;
      throw err;
    }
    if (!String(paymentReceiptData).startsWith('data:image/')) {
      const err = new Error('Payment receipt must be an image');
      err.status = 400;
      throw err;
    }
    const uploaded = await uploadImage(paymentReceiptData, 'okz/receipts');
    url = uploaded.url;
  }

  if (!url || !/^https?:\/\//i.test(url)) {
    const err = new Error('Upload a transaction receipt screenshot before placing this order');
    err.status = 400;
    throw err;
  }

  return url;
};

const persistOrder = async ({
  userId = null,
  guestName = null,
  guestPhone = null,
  guestEmail = null,
  paymentMethod,
  paymentReceiptUrl = null,
  shippingAddress,
  itemsData,
  itemsPrice,
  shippingPrice,
  discountAmount,
  totalPrice,
  couponId,
  savedCouponCode,
}) => {
  const order = await prisma.$transaction(async (tx) => {
    for (const item of itemsData) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }

      if (product.sizes?.length && item.size) {
        const sizeStock = { ...(product.sizeStock || {}) };
        const current = Number(sizeStock[item.size]) || 0;
        if (current < item.qty) {
          throw new Error(`Insufficient stock for ${item.name} (size ${item.size})`);
        }
        sizeStock[item.size] = current - item.qty;
        const newTotal = product.sizes.reduce(
          (sum, size) => sum + (Number(sizeStock[size]) || 0),
          0
        );
        await tx.product.update({
          where: { id: item.productId },
          data: { sizeStock, stock: newTotal },
        });
      } else {
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.qty } },
          data: { stock: { decrement: item.qty } },
        });
        if (updated.count === 0) {
          throw new Error(`Insufficient stock for ${item.name}`);
        }
      }
    }

    const initialStatus = requiresPaymentReceipt(paymentMethod) ? 'pending' : 'confirmed';

    return tx.order.create({
      data: {
        userId,
        guestName,
        guestPhone,
        guestEmail,
        status: initialStatus,
        paymentMethod,
        paymentReceiptUrl,
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
  return order;
};

/** Put reserved stock back when an order is canceled or deleted (once). */
const restoreOrderStock = async (tx, items) => {
  if (!items?.length) return;

  for (const item of items) {
    const product = await tx.product.findUnique({ where: { id: item.productId } });
    if (!product) continue;

    const qty = Number(item.qty) || 0;
    if (qty < 1) continue;

    if (product.sizes?.length && item.size) {
      const sizeStock = { ...(product.sizeStock || {}) };
      sizeStock[item.size] = (Number(sizeStock[item.size]) || 0) + qty;
      const newTotal = product.sizes.reduce(
        (sum, size) => sum + (Number(sizeStock[size]) || 0),
        0
      );
      await tx.product.update({
        where: { id: item.productId },
        data: { sizeStock, stock: newTotal },
      });
    } else {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: qty } },
      });
    }
  }
};

const createOrder = async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      return res.status(403).json({ message: 'Only customers can place orders' });
    }

    const {
      orderItems,
      paymentMethod,
      shippingAddress,
      couponCode,
      paymentReceiptUrl,
      paymentReceiptData,
    } = req.body;
    if (!paymentMethod || !shippingAddress) {
      return res.status(400).json({ message: 'Payment method and shipping address required' });
    }
    try {
      requireShippingAddress(shippingAddress);
    } catch (err) {
      return res.status(err.status).json({ message: err.message });
    }

    const receiptUrl = await resolvePaymentReceiptUrl({
      paymentMethod,
      paymentReceiptUrl,
      paymentReceiptData,
    });

    const { itemsPrice, itemsData } = await buildOrderItems(orderItems);
    const { discountAmount, couponId, savedCouponCode } = await resolveCoupon(
      couponCode,
      itemsPrice
    );
    const shippingPrice = calcShipping(itemsPrice, shippingAddress.state);
    const totalPrice = Math.max(0, itemsPrice + shippingPrice - discountAmount);

    const order = await persistOrder({
      userId: req.user.id,
      paymentMethod,
      paymentReceiptUrl: receiptUrl,
      shippingAddress,
      itemsData,
      itemsPrice,
      shippingPrice,
      discountAmount,
      totalPrice,
      couponId,
      savedCouponCode,
    });

    const payload = serializeOrder(order);
    res.status(201).json(payload);
    queueOrderConfirmationEmail(payload);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
    if (error.message?.startsWith('Insufficient stock')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

const createGuestOrder = async (req, res) => {
  try {
    const {
      orderItems,
      paymentMethod,
      shippingAddress,
      couponCode,
      guestName,
      guestPhone,
      guestEmail,
      paymentReceiptUrl,
      paymentReceiptData,
    } = req.body;

    const name = String(guestName || '').trim();
    const phone = normalizePhone(guestPhone);
    const email = guestEmail ? String(guestEmail).trim().toLowerCase() : '';

    if (!name || !phone) {
      return res.status(400).json({ message: 'Name and phone are required' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'A valid email is required' });
    }
    if (!paymentMethod || !shippingAddress) {
      return res.status(400).json({ message: 'Payment method and shipping address required' });
    }
    try {
      requireShippingAddress(shippingAddress);
    } catch (err) {
      return res.status(err.status).json({ message: err.message });
    }

    const receiptUrl = await resolvePaymentReceiptUrl({
      paymentMethod,
      paymentReceiptUrl,
      paymentReceiptData,
    });

    const { itemsPrice, itemsData } = await buildOrderItems(orderItems);
    const { discountAmount, couponId, savedCouponCode } = await resolveCoupon(
      couponCode,
      itemsPrice
    );
    const shippingPrice = calcShipping(itemsPrice, shippingAddress.state);
    const totalPrice = Math.max(0, itemsPrice + shippingPrice - discountAmount);

    const order = await persistOrder({
      userId: null,
      guestName: name,
      guestPhone: phone,
      guestEmail: email,
      paymentMethod,
      paymentReceiptUrl: receiptUrl,
      shippingAddress,
      itemsData,
      itemsPrice,
      shippingPrice,
      discountAmount,
      totalPrice,
      couponId,
      savedCouponCode,
    });

    const payload = serializeOrder(order);
    res.status(201).json(payload);
    queueOrderConfirmationEmail(payload);
  } catch (error) {
    if (error.status) return res.status(error.status).json({ message: error.message });
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
  customerName: order.user?.name || order.guestName || null,
  customerPhone: order.user?.phone || order.guestPhone || null,
  customerEmail: order.user?.email || order.guestEmail || null,
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

    const isOwner = order.userId && order.userId === req.user.id;
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

    const existing = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!existing) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = await prisma.$transaction(async (tx) => {
      // Canceling restores stock and clears payment so finance ignores the money
      if (status === 'canceled' && existing.status !== 'canceled') {
        await restoreOrderStock(tx, existing.items);
      }

      const data = { status };
      if (status === 'delivered') {
        data.deliveredAt = new Date();
        data.isPaid = true;
        data.paidAt = new Date();
      }

      if (status === 'canceled') {
        data.isPaid = false;
        data.paidAt = null;
        data.deliveredAt = null;
      }

      // Admin confirming a digital-wallet transfer (InstaPay / Online Wallet)
      if (
        status === 'confirmed' &&
        existing.status === 'pending' &&
        requiresPaymentReceipt(existing.paymentMethod)
      ) {
        data.isPaid = true;
        data.paidAt = new Date();
      }

      return tx.order.update({
        where: { id: req.params.id },
        data,
        include: {
          items: true,
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      });
    });

    if (status === 'canceled' && existing.status !== 'canceled') {
      cache.invalidate('products');
      cache.invalidate('product');
    }

    res.json(serializeOrder(order));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteOrder = async (req, res) => {
  try {
    const existing = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!existing) return res.status(404).json({ message: 'Order not found' });

    await prisma.$transaction(async (tx) => {
      // Restore stock unless it was already returned on cancel
      if (existing.status !== 'canceled') {
        await restoreOrderStock(tx, existing.items);
      }
      await tx.problemRequest.deleteMany({ where: { orderId: req.params.id } });
      await tx.orderItem.deleteMany({ where: { orderId: req.params.id } });
      await tx.order.delete({ where: { id: req.params.id } });
    });

    if (existing.status !== 'canceled') {
      cache.invalidate('products');
      cache.invalidate('product');
    }

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

    // Canceled orders never count toward money / order totals
    const where = {
      status: { not: 'canceled' },
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
    };

    const orders = await prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    const revenue = orders.reduce((sum, o) => sum + Number(o.totalPrice), 0);
    const paid = orders
      .filter((o) => o.isPaid)
      .reduce((sum, o) => sum + Number(o.totalPrice), 0);
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
  createGuestOrder,
  myOrders,
  getOrder,
  listOrders,
  updateOrderStatus,
  deleteOrder,
  financeSummary,
};
