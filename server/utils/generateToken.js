const jwt = require('jsonwebtoken');

const generateToken = (id, role) => {
  const secret = process.env.JWT_SECRET;
  if (!secret || String(secret).length < 16) {
    throw new Error('JWT_SECRET must be set to a strong value (16+ characters)');
  }
  const expiresIn = role === 'admin' || role === 'ops' ? '12h' : '7d';
  return jwt.sign({ id, role }, secret, { expiresIn });
};

module.exports = generateToken;
