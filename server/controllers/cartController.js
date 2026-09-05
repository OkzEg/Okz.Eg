const prisma = require('../lib/prisma');

const getCart = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
    });

    if (!cart) {
      return res.json({ items: [] });
    }

    return res.json({ items: cart.items });
  } catch (error) {
    console.error('[getCart]', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

const saveCart = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { items } = req.body;
    
    if (!Array.isArray(items)) {
      return res.status(400).json({ message: 'Items must be an array' });
    }

    const cart = await prisma.cart.upsert({
      where: { userId: req.user.id },
      update: { 
        items,
        abandonedEmailSentAt: items.length > 0 ? null : undefined, // Reset email sent flag when items change
      },
      create: { 
        userId: req.user.id, 
        items,
        abandonedEmailSentAt: null,
      },
    });

    return res.json({ items: cart.items });
  } catch (error) {
    console.error('[saveCart]', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getCart,
  saveCart,
};
