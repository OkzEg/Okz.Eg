const prisma = require('../lib/prisma');
const { sendSimpleEmail } = require('../utils/mail');

const CHECK_INTERVAL = 15 * 60 * 1000; // Check every 15 mins
const ABANDONED_TIME = 2 * 60 * 60 * 1000; // 2 hours

const startAbandonedCartWorker = () => {
  console.log('[abandonedCartWorker] Started background worker (2-hour delay)');

  setInterval(async () => {
    try {
      const twoHoursAgo = new Date(Date.now() - ABANDONED_TIME);

      const abandonedCarts = await prisma.cart.findMany({
        where: {
          updatedAt: { lte: twoHoursAgo },
          abandonedEmailSentAt: null,
          user: {
            isEmailVerified: true, // Optional: Only send if email is verified
          }
        },
        include: {
          user: true,
        },
      });

      for (const cart of abandonedCarts) {
        // Double check items
        if (!cart.items || !Array.isArray(cart.items) || cart.items.length === 0) {
          continue;
        }

        const itemsWord = cart.items.length === 1 ? 'item' : 'items';
        const subject = `You left something behind!`;
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #000;">Hi ${cart.user.name.split(' ')[0] || 'there'},</h2>
            <p>We noticed you left ${cart.items.length} ${itemsWord} in your OKZ shopping cart.</p>
            <p>Your premium leather goods are waiting for you. Complete your order before they sell out!</p>
            <div style="margin: 30px 0;">
              ${cart.items.map(item => `
                <div style="display: flex; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 15px;">
                  <img src="${item.image}" alt="${item.name}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; margin-right: 15px;" />
                  <div>
                    <h4 style="margin: 0 0 5px 0;">${item.name}</h4>
                    <p style="margin: 0; color: #666; font-size: 14px;">${item.price} EGP × ${item.qty}</p>
                    ${item.size ? `<p style="margin: 0; color: #666; font-size: 14px;">Size: ${item.size}</p>` : ''}
                    ${item.color ? `<p style="margin: 0; color: #666; font-size: 14px;">Color: ${item.color}</p>` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
            <a href="https://www.okz-eg.store/cart" style="display: inline-block; background-color: #000; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold;">Return to Cart</a>
            <p style="margin-top: 30px; font-size: 12px; color: #999;">If you need any help, just reply to this email.</p>
          </div>
        `;
        const text = `Hi ${cart.user.name.split(' ')[0] || 'there'},\n\nWe noticed you left items in your cart. Return to https://www.okz-eg.store/cart to complete your purchase!`;

        await sendSimpleEmail({
          to: cart.user.email,
          subject,
          text,
          html,
        });

        await prisma.cart.update({
          where: { id: cart.id },
          data: { abandonedEmailSentAt: new Date() },
        });

        console.log(`[abandonedCartWorker] Sent recovery email to ${cart.user.email}`);
      }
    } catch (error) {
      console.error('[abandonedCartWorker] Error processing abandoned carts:', error);
    }
  }, CHECK_INTERVAL);
};

module.exports = { startAbandonedCartWorker };
