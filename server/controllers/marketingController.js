const prisma = require('../lib/prisma');
const { sendSimpleEmail } = require('../utils/mail');

const sendBulkEmail = async (req, res) => {
  try {
    const { subject, html } = req.body;

    if (!subject || !html) {
      return res.status(400).json({ message: 'Subject and HTML content are required' });
    }

    // Immediately respond to the client so the frontend doesn't hang
    res.json({ message: 'Bulk email broadcast started in the background.' });

    // Process the emails in the background
    Promise.resolve().then(async () => {
      try {
        const customers = await prisma.user.findMany({
          where: { role: 'customer' },
          select: { email: true, name: true }
        });

        console.log(`[Marketing] Starting bulk email to ${customers.length} customers...`);

        let successCount = 0;
        let failCount = 0;

        for (const customer of customers) {
          if (!customer.email) continue;

          try {
            await sendSimpleEmail({
              to: customer.email,
              subject,
              html: html.replace(/{{name}}/g, customer.name ? customer.name.split(' ')[0] : 'there'),
            });
            successCount++;
          } catch (error) {
            console.error(`[Marketing] Failed to send to ${customer.email}:`, error);
            failCount++;
          }

          // Delay for 500ms to avoid SMTP rate limits
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        console.log(`[Marketing] Bulk email finished. Success: ${successCount}, Failed: ${failCount}`);
      } catch (err) {
        console.error('[Marketing] Error during background bulk email:', err);
      }
    });
  } catch (error) {
    console.error('[Marketing] Controller error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ message: 'Server error starting bulk email' });
    }
  }
};

module.exports = {
  sendBulkEmail,
};
