const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const prisma = require('../lib/prisma');
const generateToken = require('../utils/generateToken');
const { sendError } = require('../utils/safeError');
const { sendSimpleEmail } = require('../utils/mail');
const {
  assertPassword,
  isValidEgyptianPhone,
  normalizeEgyptianPhone,
  isValidEmail,
  MAX_PASSWORD_LENGTH,
} = require('../utils/validation');

const BCRYPT_ROUNDS = 12;
const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const sanitizeUser = (user) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  phone: user.phone,
  address: user.address,
  token: generateToken(user.id, user.role),
});

const generateVerificationToken = () => crypto.randomBytes(32).toString('hex');

const sendVerificationEmail = async (user, token) => {
  const baseUrl = process.env.CLIENT_URL || 'https://www.okz-eg.store';
  const link = `${baseUrl}/verify-email?token=${token}`;
  try {
    await sendSimpleEmail({
      to: user.email,
      subject: 'Verify your OKZ account',
      text: `Hi ${user.name},\n\nVerify your OKZ account by clicking this link:\n${link}\n\nThis link expires in 24 hours.\n\nIf you didn't create an account, ignore this email.`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
          <h2 style="color:#1a1a1a;margin-bottom:8px">Verify your OKZ account</h2>
          <p style="color:#555;margin-bottom:24px">Hi ${user.name},<br/>Click the button below to activate your account. This link expires in 24 hours.</p>
          <a href="${link}" style="display:inline-block;background:#c8a96e;color:#fff;text-decoration:none;padding:12px 28px;border-radius:6px;font-weight:bold;font-size:15px;letter-spacing:.04em">Verify Email</a>
          <p style="color:#999;font-size:12px;margin-top:24px">Or copy this link: ${link}</p>
          <p style="color:#ccc;font-size:11px">If you didn't create an account, you can ignore this email.</p>
        </div>`,
    });
  } catch (err) {
    console.error('[auth] Failed to send verification email:', err.message);
  }
};

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

    const normalizedEmail = email.toLowerCase().trim().slice(0, 160);
    const normalizedPhone = normalizeEgyptianPhone(phone);

    const exists = await prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedEmail }, { phone: normalizedPhone }],
      },
    });

    if (exists) {
      if (exists.email === normalizedEmail) {
        // If the account exists but is unverified, resend the email
        if (!exists.isEmailVerified) {
          const token = generateVerificationToken();
          const expires = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);
          await prisma.user.update({
            where: { id: exists.id },
            data: { verificationToken: token, verificationTokenExpires: expires },
          });
          await sendVerificationEmail(exists, token);
          return res.status(202).json({
            pending: true,
            message: 'We sent a new verification email. Please check your inbox.',
          });
        }
        return res.status(400).json({ message: 'User already exists with this email' });
      }
      if (exists.phone === normalizedPhone) {
        return res.status(400).json({ message: 'This phone number is already registered' });
      }
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const token = generateVerificationToken();
    const expires = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

    const user = await prisma.user.create({
      data: {
        name: String(name).trim().slice(0, 120),
        email: normalizedEmail,
        passwordHash,
        phone: normalizedPhone,
        address,
        role: 'customer',
        isEmailVerified: false,
        verificationToken: token,
        verificationTokenExpires: expires,
      },
    });

    // Fire-and-forget verification email
    sendVerificationEmail(user, token);

    res.status(201).json({
      pending: true,
      message: 'Account created! Please check your email to verify your account before logging in.',
    });
  } catch (error) {
    return sendError(res, error, 'Registration failed');
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Verification token is required' });

    const user = await prisma.user.findUnique({ where: { verificationToken: token } });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification link' });
    }

    if (user.verificationTokenExpires && user.verificationTokenExpires < new Date()) {
      return res.status(400).json({
        message: 'This verification link has expired. Please request a new one.',
        expired: true,
      });
    }

    const verified = await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        verificationToken: null,
        verificationTokenExpires: null,
      },
    });

    res.json({ ...sanitizeUser(verified), message: 'Email verified! Welcome to OKZ.' });
  } catch (error) {
    return sendError(res, error, 'Verification failed');
  }
};

const resendVerification = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });

    // Always respond 200 to avoid user enumeration
    if (!user || user.isEmailVerified) {
      return res.json({ message: 'If your email is registered and unverified, we sent a new link.' });
    }

    const token = generateVerificationToken();
    const expires = new Date(Date.now() + VERIFY_TOKEN_TTL_MS);

    await prisma.user.update({
      where: { id: user.id },
      data: { verificationToken: token, verificationTokenExpires: expires },
    });

    sendVerificationEmail(user, token);

    res.json({ message: 'If your email is registered and unverified, we sent a new link.' });
  } catch (error) {
    return sendError(res, error, 'Could not resend verification');
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

    // Only enforce verification for customer accounts (not admin/ops)
    if (user.role === 'customer' && !user.isEmailVerified) {
      return res.status(403).json({
        message: 'Please verify your email before logging in.',
        unverified: true,
        email: user.email,
      });
    }

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
    const isCustomer = req.user.role === 'customer';
    const { name, email, password, phone, address } = req.body;
    const data = {};

    if (name) data.name = String(name).trim().slice(0, 120);

    if (email) {
      if (!isValidEmail(email)) {
        return res.status(400).json({ message: 'A valid email is required' });
      }
      data.email = email.toLowerCase();
    }

    if (isCustomer && phone) {
      if (!isValidEgyptianPhone(phone)) {
        return res.status(400).json({ message: 'Enter a valid Egyptian mobile number (01xxxxxxxxx)' });
      }
      data.phone = normalizeEgyptianPhone(phone);
    }

    if (isCustomer && address) data.address = address;

    if (password) {
      assertPassword(password);
      data.passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    }

    if (data.email || data.phone) {
      const orConditions = [];
      if (data.email) orConditions.push({ email: data.email });
      if (data.phone) orConditions.push({ phone: data.phone });

      const existing = await prisma.user.findFirst({
        where: {
          OR: orConditions,
          NOT: { id: req.user.id },
        },
      });

      if (existing) {
        if (data.email && existing.email === data.email) {
          return res.status(400).json({ message: 'This email is already registered' });
        }
        if (data.phone && existing.phone === data.phone) {
          return res.status(400).json({ message: 'This phone number is already registered' });
        }
      }
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
    });
    return res.json(sanitizeUser(user));
  } catch (error) {
    return sendError(res, error, 'Could not update profile');
  }
};

const googleAuth = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'No token provided' });

    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { sub: googleId, email, name, email_verified } = payload;

    if (!email_verified) {
      return res.status(400).json({ message: 'Google email is not verified' });
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Link googleId if missing
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId, isEmailVerified: true },
        });
      }
    } else {
      // Create new user without a password
      user = await prisma.user.create({
        data: {
          email,
          name,
          googleId,
          isEmailVerified: true,
          role: 'customer',
        },
      });
    }

    return res.json(sanitizeUser(user));
  } catch (error) {
    console.error('[auth] googleAuth failed:', error.message);
    return res.status(401).json({ message: 'Google authentication failed' });
  }
};

module.exports = { registerCustomer, verifyEmail, resendVerification, login, getMe, updateProfile, googleAuth };
