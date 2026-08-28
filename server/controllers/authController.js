const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const generateToken = require('../utils/generateToken');
const { sendError } = require('../utils/safeError');
const {
  assertPassword,
  isValidEgyptianPhone,
  normalizeEgyptianPhone,
  isValidEmail,
  MAX_PASSWORD_LENGTH,
} = require('../utils/validation');

const BCRYPT_ROUNDS = 12;

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  address: user.address,
  token: generateToken(user.id, user.role),
});

const registerCustomer = async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;
    if (!name || !email || !password || !phone || !address) {
      return res.status(400).json({
        message: 'Name, email, password, phone, and address are required',
      });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'A valid email is required' });
    }
    if (!isValidEgyptianPhone(phone)) {
      return res
        .status(400)
        .json({ message: 'Enter a valid Egyptian mobile number (01xxxxxxxxx)' });
    }
    assertPassword(password);

    const exists = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (exists) return res.status(400).json({ message: 'User already exists' });

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.user.create({
      data: {
        name: String(name).trim().slice(0, 120),
        email: email.toLowerCase().trim().slice(0, 160),
        passwordHash,
        phone: normalizeEgyptianPhone(phone),
        address,
        role: 'customer',
      },
    });

    res.status(201).json(sanitizeUser(user));
  } catch (error) {
    return sendError(res, error, 'Registration failed');
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({
      where: { email: (email || '').toLowerCase() },
    });
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    const match = await bcrypt.compare(
      String(password || '').slice(0, MAX_PASSWORD_LENGTH),
      user.passwordHash
    );
    if (!match) return res.status(401).json({ message: 'Invalid email or password' });

    res.json(sanitizeUser(user));
  } catch (error) {
    return sendError(res, error, 'Login failed');
  }
};

const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
        createdAt: true,
      },
    });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    return sendError(res, error);
  }
};

const updateProfile = async (req, res) => {
  try {
    if (req.user.role !== 'customer') {
      const { name, email, password } = req.body;
      const data = {};
      if (name) data.name = String(name).trim().slice(0, 120);
      if (email) {
        if (!isValidEmail(email)) {
          return res.status(400).json({ message: 'A valid email is required' });
        }
        data.email = email.toLowerCase();
      }
      if (password) {
        assertPassword(password);
        data.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      }

      const user = await prisma.user.update({
        where: { id: req.user.id },
        data,
      });
      return res.json(sanitizeUser(user));
    }

    const { name, email, password, phone, address } = req.body;
    const data = {};
    if (name) data.name = String(name).trim().slice(0, 120);
    if (email) {
      if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'A valid email is required' });
      }
      data.email = email.toLowerCase();
    }
    if (phone) {
      if (!isValidEgyptianPhone(phone)) {
        return res
          .status(400)
          .json({ message: 'Enter a valid Egyptian mobile number (01xxxxxxxxx)' });
      }
      data.phone = normalizeEgyptianPhone(phone);
    }
    if (address) data.address = address;
    if (password) {
      assertPassword(password);
      data.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
    });
    res.json(sanitizeUser(user));
  } catch (error) {
    return sendError(res, error, 'Could not update profile');
  }
};

module.exports = { registerCustomer, login, getMe, updateProfile };
