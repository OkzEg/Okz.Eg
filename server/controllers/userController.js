const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { sendError } = require('../utils/safeError');
const { assertPassword, isValidEmail } = require('../utils/validation');

const listUsers = async (req, res) => {
  try {
    const role = req.query.role;
    const users = await prisma.user.findMany({
      where: role ? { role } : { role: { in: ['admin', 'ops'] } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (error) {
    return sendError(res, error);
  }
};

const createStaffUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Name, email, password, and role are required' });
    }
    if (!['admin', 'ops'].includes(role)) {
      return res.status(400).json({ message: 'Role must be admin or ops' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'A valid email is required' });
    }
    assertPassword(password);

    const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) return res.status(400).json({ message: 'User already exists' });

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        name: String(name).trim().slice(0, 120),
        email: email.toLowerCase().trim(),
        passwordHash,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    res.status(201).json(user);
  } catch (error) {
    return sendError(res, error, 'Could not create user');
  }
};

const deleteUser = async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: 'User deleted' });
  } catch (error) {
    return sendError(res, error, 'Could not delete user');
  }
};

const listCustomers = async (req, res) => {
  try {
    const customers = await prisma.user.findMany({
      where: { role: 'customer' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });
    res.json(customers);
  } catch (error) {
    return sendError(res, error);
  }
};

module.exports = { listUsers, createStaffUser, deleteUser, listCustomers };
