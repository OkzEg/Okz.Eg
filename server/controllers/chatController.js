const { GoogleGenAI } = require('@google/genai');
const prisma = require('../lib/prisma');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || 'dummy_key_to_prevent_crash',
});

const handleChat = async (req, res) => {
  try {
    const { messages, wishlist } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Messages array is required' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ 
        message: 'Gemini API key is missing on the server. Please add GEMINI_API_KEY to your .env file.' 
      });
    }

    // Fetch active products from the database
    const products = await prisma.product.findMany({
      where: { stock: { gt: 0 } },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        type: true,
        colors: true,
        sizes: true,
        isSaleActive: true,
        salePrice: true,
      },
    });

    const productsContext = products.map((p) => {
      const priceStr = p.isSaleActive ? `${p.salePrice} EGP (Sale from ${p.price} EGP)` : `${p.price} EGP`;
      return `- ${p.name} (${p.type}): ${priceStr}. Colors: ${p.colors.join(', ')}. Sizes: ${p.sizes.join(', ')}. ${p.description}`;
    }).join('\n');

    let wishlistContext = 'The user has no items in their wishlist.';
    if (wishlist && Array.isArray(wishlist) && wishlist.length > 0) {
      const wishlistNames = wishlist.map((w) => w.name || w.id).join(', ');
      wishlistContext = `The user currently has these items in their wishlist: ${wishlistNames}.`;
    }

    const systemPrompt = `You are the OKZ Assistant, a premium AI shopping assistant for OKZ, a high-end leather boots and gear store in Egypt.
Your goal is to help customers find the perfect product, answer questions about OKZ, and guide them to make a purchase.
You are professional, concise, and helpful. Do not be overly talkative. Use short paragraphs.

About OKZ:
- We sell premium leather boots, belts, wallets, and accessories.
- We offer fast delivery across Egypt. Shipping rates are calculated at checkout based on the governorate, but we offer FREE shipping for all orders over 3,000 EGP.
- We offer a 14-day return and exchange policy. Items must be unworn, in original condition, and in their original packaging.
- Payment methods include Cash on Delivery, InstaPay, Vodafone Cash, and Online Wallet.
- Our most popular best-selling products are the Black Chamois Soft Finish, Wheat Signature Edition, and White Leather Pattern Edition. Always confidently recommend these if a customer asks for best-sellers or is undecided.

Current Available Catalog:
${productsContext}

User Context:
${wishlistContext}

Instructions:
- Confidently answer questions about shipping, returns, and best-sellers using the information above. NEVER say you don't have access to sales data or shipping info.
- Only recommend products from the "Current Available Catalog" list. Do NOT invent products.
- If a user asks for something we don't have, politely let them know and recommend the closest alternative we do have.
- Answer questions in English, but you can reply in Arabic if the user speaks Arabic.
- If you don't know the answer to something not covered here, ask them to contact support.`;

    const apiMessages = messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: String(m.content).slice(0, 1000) }], // Prevent huge payloads
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: apiMessages,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.7,
        maxOutputTokens: 500,
      }
    });

    res.json({
      role: 'assistant',
      content: response.text,
    });
  } catch (error) {
    console.error('[chatController] Error:', error);
    res.status(500).json({ message: 'Sorry, I am having trouble connecting right now. Please try again later.' });
  }
};

module.exports = { handleChat };
