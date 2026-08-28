const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

const STAFF_ROLES = new Set(['admin', 'ops']);

const protect = async (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        return res.status(500).json({ message: 'Server auth is not configured' });
      }
      const token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, secret);
      if (!decoded?.id || !decoded?.role) {
        return res.status(401).json({ message: 'Not authorized, token invalid' });
      }
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, role: true },
      });
      if (!user) {
        return res.status(401).json({ message: 'User no longer exists' });
      }
      req.user = { id: user.id, role: user.role };
      return next();
    } catch {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }
  return res.status(401).json({ message: 'Not authorized, no token' });
};

const optionalProtect = async (req, res, next) => {
  if (!req.headers.authorization?.startsWith('Bearer')) return next();
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) return next();
    const token = req.headers.authorization.split(' ')[1];
    const decoded = jwt.verify(token, secret);
    if (decoded?.id && decoded?.role) {
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true, role: true },
      });
      if (user) {
        req.user = { id: user.id, role: user.role };
      }
    }
  } catch {}
  return next();
};

const requireFreshStaff = async (req, res, next) => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Not authorized' });
    }
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, role: true },
    });
    if (!user || !STAFF_ROLES.has(user.role)) {
      return res.status(403).json({ message: 'Ops or admin access required' });
    }
    req.user = { id: user.id, role: user.role };
    return next();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ message: 'Admin access required' });
};

const opsOrAdmin = (req, res, next) => {
  if (req.user && STAFF_ROLES.has(req.user.role)) return next();
  return res.status(403).json({ message: 'Ops or admin access required' });
};

module.exports = {
  protect,
  optionalProtect,
  requireFreshStaff,
  adminOnly,
  opsOrAdmin,
};
