const prisma = require('../lib/prisma');
const cache = require('../lib/cache');
const { getAvailableStock } = require('./productController');
const { uploadImage, isCloudinaryConfigured } = require('../utils/cloudinary');
const { queueOrderConfirmationEmail } = require('../utils/mail');
const { sendError } = require('../utils/safeError');
const {
  MAX_ORDER_LINES,
  MAX_QTY_PER_LINE,
  normalizeEgyptianPhone,
  isValidEgyptianPhone,
  isValidEmail,
  assertPaymentMethod,
  requiresPaymentReceipt,
} = require('../utils/validation');
const { runCheckoutBotChecks, recordPhoneOrder } = require('../middleware/botDefense');

const FREE_SHIPPING_MIN = 3000;
const SHIPPING_FEE_CAIRO_GIZA = 80;
const SHIPPING_FEE_OTHER = 110;

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
  if (!String(shippingAddress.street || '').trim()) {
    const err = new Error('Detailed address is required');
    err.status = 400;
    throw err;
  }
  if (!String(shippingAddress.state || '').trim()) {
    const err = new Error('Governorate is required');
    err.status = 400;
    throw err;
  }
};

const sanitizeShippingAddress = (shippingAddress) => {
  const state = String(shippingAddress.state || '').trim().slice(0, 100);
  const city =
    String(shippingAddress.city || '').trim().slice(0, 100) || state || 'Egypt';
  return {
    street: String(shippingAddress.street || '').trim().slice(0, 400),
    city,
    state,
    zip: String(shippingAddress.zip || '').trim().slice(0, 20),
    country: String(shippingAddress.country || 'Egypt').trim().slice(0, 80) || 'Egypt',
  };
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

const isAllowedReceiptUrl = (url) => {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloud || !url) return false;
  try {
    const parsed = new URL(String(url));
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'res.cloudinary.com' &&
      parsed.pathname.startsWith(`/${cloud}/`)
    );
  } catch {
    return false;
  }
};

const buildOrderItems = async (orderItems) => {
  if (!Array.isArray(orderItems) || !orderItems.length) {
    const err = new Error('No order items');
    err.status = 400;
    throw err;
  }
  if (orderItems.length > MAX_ORDER_LINES) {
    const err = new Error(`Orders are limited to ${MAX_ORDER_LINES} line items`);
    err.status = 400;
    throw err;
  }

  const productIds = orderItems.map((i) => i.productId).filter(Boolean);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
  });
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));

  let itemsPrice = 0;
  const itemsData = [];

  for (const item of orderItems) {
    const product = byId[item.productId];
    if (!product) {
      const err = new Error('One or more products are unavailable');
      err.status = 400;
      throw err;
    }
    const qty = Math.trunc(Number(item.qty));
    if (!Number.isFinite(qty) || qty < 1 || qty > MAX_QTY_PER_LINE) {
      const err = new Error(`Quantity for ${product.name} must be between 1 and ${MAX_QTY_PER_LINE}`);
      err.status = 400;
      throw err;
    }
    if (product.sizes?.length) {
      if (!item.size || !product.sizes.includes(String(item.size))) {
        const err = new Error(`Select a valid size for ${product.name}`);
        err.status = 400;
        throw err;
      }
    }
    if (item.color && product.colors?.length && !product.colors.includes(String(item.color))) {
      const err = new Error(`Select a valid color for ${product.name}`);
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
      cost: Number(product.cost) || 1000,
      color: item.color ? String(item.color).slice(0, 60) : null,
      size: item.size ? String(item.size).slice(0, 20) : null,
    });
  }

  return { itemsPrice, itemsData };
};

const resolveCoupon = async (couponCode, itemsPrice) => {
  let discountAmount = 0;
  let couponId = null;
  let savedCouponCode = null;
  const code = String(couponCode || '').trim().slice(0, 40);
  if (!code) {
    return { discountAmount, couponId, savedCouponCode };
  }

  const coupon = await prisma.coupon.findUnique({
    where: { code: code.toUpperCase() },
  });
  if (!coupon || !coupon.isActive) {
    const err = new Error('Invalid coupon');
    err.status = 400;
    throw err;
  }
  if (coupon.maxUsage != null && coupon.usageCount >= coupon.maxUsage) {
    const err = new Error('Coupon usage limit reached');
    err.status = 400;
    throw err;
  }
  const pct = Math.min(100, Math.max(0, Number(coupon.discountPercentage) || 0));
  discountAmount = (itemsPrice * pct) / 100;
  couponId = coupon.id;
  savedCouponCode = coupon.code;
  return { discountAmount, couponId, savedCouponCode };
};

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
    if (!/^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(String(paymentReceiptData))) {
      const err = new Error('Payment receipt must be a JPEG, PNG, or WebP image');
      err.status = 400;
      throw err;
    }
    if (String(paymentReceiptData).length > 6_000_000) {
      const err = new Error('Receipt image is too large');
      err.status = 400;
      throw err;
    }
    const uploaded = await uploadImage(paymentReceiptData, 'okz/receipts');
    url = uploaded.url;
  }

  if (!isAllowedReceiptUrl(url)) {
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
      await tx.$queryRaw`SELECT id FROM "Product" WHERE id = ${item.productId} FOR UPDATE`;

      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        throw Object.assign(new Error(`Product not found: ${item.productId}`), { status: 400 });
      }

      if (product.sizes?.length && item.size) {
        const sizeStock = { ...(product.sizeStock || {}) };
        const current = Number(sizeStock[item.size]) || 0;
        if (current < item.qty) {
          throw Object.assign(
            new Error(`Insufficient stock for ${item.name} (size ${item.size})`),
            { status: 400 }
          );
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
          throw Object.assign(new Error(`Insufficient stock for ${item.name}`), { status: 400 });
        }
      }
    }

    if (couponId) {
      await tx.coupon.update({
        where: { id: couponId },
        data: { usageCount: { increment: 1 } },
      });
    }

    return tx.order.create({
      data: {
        userId,
        guestName,
        guestPhone,
        guestEmail,
        status: 'pending',
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

const serializeOrder = (order, { includeCost = false } = {}) => ({
  id: order.id,
  userId: order.userId,
  guestName: order.guestName,
  guestPhone: order.guestPhone,
  guestEmail: order.guestEmail,
  status: order.status,
  paymentMethod: order.paymentMethod,
  paymentReceiptUrl: order.paymentReceiptUrl,
  shippingAddress: order.shippingAddress,
  itemsPrice: Number(order.itemsPrice),
  shippingPrice: Number(order.shippingPrice),
  discountAmount: Number(order.discountAmount),
  totalPrice: Number(order.totalPrice),
  couponId: order.couponId,
  couponCode: order.couponCode,
  isPaid: order.isPaid,
  paidAt: order.paidAt,
  deliveredAt: order.deliveredAt,
  createdAt: order.createdAt,
  updatedAt: order.updatedAt,
  user: order.user || undefined,
  problems: order.problems || undefined,
  items: order.items?.map((i) => {
    const row = {
      id: i.id,
      orderId: i.orderId,
      productId: i.productId,
      name: i.name,
      qty: i.qty,
      image: i.image,
      price: Number(i.price),
      color: i.color,
      size: i.size,
    };
    if (includeCost) row.cost = i.cost != null ? Number(i.cost) : 1000;
    return row;
  }),
  customerName: order.guestName || order.user?.name || null,
  customerPhone: order.guestPhone || order.user?.phone || null,
  customerEmail: order.guestEmail || order.user?.email || null,
});

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
      guestName,
      guestPhone,
      guestEmail,
      contactName,
      contactPhone,
      contactEmail,
    } = req.body;

    const method = assertPaymentMethod(paymentMethod);
    const name = String(contactName || guestName || '').trim().slice(0, 120);
    const phoneRaw = contactPhone || guestPhone || '';
    const phone = isValidEgyptianPhone(phoneRaw) ? normalizeEgyptianPhone(phoneRaw) : '';
    const emailRaw = String(contactEmail || guestEmail || '').trim().toLowerCase().slice(0, 160);

    if (!name || !phone) {
      return res.status(400).json({ message: 'A valid Egyptian phone number and name are required' });
    }
    if (!emailRaw || !isValidEmail(emailRaw)) {
      return res.status(400).json({ message: 'A valid email is required' });
    }

    await runCheckoutBotChecks(req, { phone });

    if (!shippingAddress) {
      return res.status(400).json({ message: 'Payment method and shipping address required' });
    }
    requireShippingAddress(shippingAddress);
    const address = sanitizeShippingAddress(shippingAddress);

    const receiptUrl = await resolvePaymentReceiptUrl({
      paymentMethod: method,
      paymentReceiptUrl,
      paymentReceiptData,
    });

    const { itemsPrice, itemsData } = await buildOrderItems(orderItems);
    const { discountAmount, couponId, savedCouponCode } = await resolveCoupon(
      couponCode,
      itemsPrice
    );
    const shippingPrice = calcShipping(itemsPrice, address.state);
    const totalPrice = Math.max(0, itemsPrice + shippingPrice - discountAmount);

    const order = await persistOrder({
      userId: req.user.id,
      guestName: name,
      guestPhone: phone,
      guestEmail: emailRaw,
      paymentMethod: method,
      paymentReceiptUrl: receiptUrl,
      shippingAddress: address,
      itemsData,
      itemsPrice,
      shippingPrice,
      discountAmount,
      totalPrice,
      couponId,
      savedCouponCode,
    });

    recordPhoneOrder(phone);
    const payload = serializeOrder(order);
    queueOrderConfirmationEmail(payload);
    res.status(201).json(payload);
  } catch (error) {
    if (error.message?.startsWith('Insufficient stock')) {
      return res.status(400).json({ message: error.message });
    }
    return sendError(res, error, 'Could not place order');
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

    const name = String(guestName || '').trim().slice(0, 120);
    const phone = isValidEgyptianPhone(guestPhone)
      ? normalizeEgyptianPhone(guestPhone)
      : '';
    const email = String(guestEmail || '')
      .trim()
      .toLowerCase()
      .slice(0, 160);

    if (!name || !phone) {
      return res
        .status(400)
        .json({ message: 'Name and a valid Egyptian mobile number (01xxxxxxxxx) are required' });
    }
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ message: 'A valid email is required' });
    }

    await runCheckoutBotChecks(req, { phone });

    const method = assertPaymentMethod(paymentMethod);
    if (!shippingAddress) {
      return res.status(400).json({ message: 'Payment method and shipping address required' });
    }
    requireShippingAddress(shippingAddress);
    const address = sanitizeShippingAddress(shippingAddress);

    const receiptUrl = await resolvePaymentReceiptUrl({
      paymentMethod: method,
      paymentReceiptUrl,
      paymentReceiptData,
    });

    const { itemsPrice, itemsData } = await buildOrderItems(orderItems);
    const { discountAmount, couponId, savedCouponCode } = await resolveCoupon(
      couponCode,
      itemsPrice
    );
    const shippingPrice = calcShipping(itemsPrice, address.state);
    const totalPrice = Math.max(0, itemsPrice + shippingPrice - discountAmount);

    const order = await persistOrder({
      userId: null,
      guestName: name,
      guestPhone: phone,
      guestEmail: email,
      paymentMethod: method,
      paymentReceiptUrl: receiptUrl,
      shippingAddress: address,
      itemsData,
      itemsPrice,
      shippingPrice,
      discountAmount,
      totalPrice,
      couponId,
      savedCouponCode,
    });

    recordPhoneOrder(phone);
    const payload = serializeOrder(order);
    queueOrderConfirmationEmail(payload);
    res.status(201).json(payload);
  } catch (error) {
    if (error.message?.startsWith('Insufficient stock')) {
      return res.status(400).json({ message: error.message });
    }
    return sendError(res, error, 'Could not place order');
  }
};

const myOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(orders.map((o) => serializeOrder(o)));
  } catch (error) {
    return sendError(res, error);
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
    res.json(serializeOrder(order, { includeCost: isStaff }));
  } catch (error) {
    return sendError(res, error);
  }
};

const listOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const page = parseInt(req.query.page, 10);
    const limit = parseInt(req.query.limit, 10) || 50;

    const query = {
      where: status ? { status: String(status) } : undefined,
      include: {
        items: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    };

    if (page && page > 0) {
      const skip = (page - 1) * limit;
      const [orders, total] = await Promise.all([
        prisma.order.findMany({ ...query, skip, take: limit }),
        prisma.order.count({ where: query.where }),
      ]);
      return res.json({
        orders: orders.map((o) => serializeOrder(o, { includeCost: true })),
        total,
        page,
        pages: Math.ceil(total / limit),
      });
    }

    const orders = await prisma.order.findMany({
      ...query,
      take: 500,
    });
    res.json(orders.map((o) => serializeOrder(o, { includeCost: true })));
  } catch (error) {
    return sendError(res, error);
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

      if (status === 'confirmed' && existing.status === 'pending') {
        if (requiresPaymentReceipt(existing.paymentMethod)) {
          data.isPaid = true;
          data.paidAt = new Date();
        }
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

    res.json(serializeOrder(order, { includeCost: true }));
  } catch (error) {
    return sendError(res, error);
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
    return sendError(res, error);
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
        id: p.id,
        name: p.name,
        stock: p.stock,
        price: Number(p.price),
        cost: p.cost != null ? Number(p.cost) : 1000,
        salePrice: p.salePrice != null ? Number(p.salePrice) : null,
      })),
      recentOrders: orders.slice(0, 10).map((o) => serializeOrder(o, { includeCost: true })),
    });
  } catch (error) {
    return sendError(res, error);
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
