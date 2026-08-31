const { GoogleGenAI } = require('@google/genai');
const prisma = require('../lib/prisma');

const CHAT_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-flash-latest',
].filter(Boolean);

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};

const extractText = (response) => {
  if (!response) return '';
  if (typeof response.text === 'string' && response.text.trim()) return response.text.trim();
  if (typeof response.text === 'function') {
    try {
      const value = response.text();
      if (typeof value === 'string' && value.trim()) return value.trim();
    } catch (_) {}
  }
  const parts = response?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    return parts
      .map((p) => (typeof p?.text === 'string' ? p.text : ''))
      .join('')
      .trim();
  }
  return '';
};

const toGeminiContents = (messages = []) => {
  const mapped = messages
    .filter((m) => m && String(m.content || '').trim())
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: String(m.content).slice(0, 1000) }],
    }));

  // Gemini multi-turn must start with a user turn (skip the local greeting).
  while (mapped.length && mapped[0].role !== 'user') mapped.shift();

  // Drop empty / malformed trailing pairs and ensure roles alternate.
  const normalized = [];
  for (const turn of mapped) {
    const prev = normalized[normalized.length - 1];
    if (prev && prev.role === turn.role) {
      prev.parts[0].text = `${prev.parts[0].text}\n${turn.parts[0].text}`.slice(0, 2000);
      continue;
    }
    normalized.push(turn);
  }
  return normalized;
};

const generateWithFallback = async (ai, contents, systemPrompt) => {
  let lastError;
  for (const model of CHAT_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.7,
          maxOutputTokens: 500,
        },
      });
      const text = extractText(response);
      if (text) return { text, model };
      lastError = new Error(`Empty response from model ${model}`);
    } catch (error) {
      lastError = error;
      console.warn(`[chatController] model ${model} failed:`, error?.message || error);
    }
  }
  throw lastError || new Error('All chat models failed');
};

const handleChat = async (req, res) => {
  try {
    const { messages, wishlist } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: 'Messages array is required' });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({
        message: 'Chat is temporarily unavailable. Please try again later.',
      });
    }

    const contents = toGeminiContents(messages);
    if (!contents.length) {
      return res.status(400).json({ message: 'Please send a message to start the chat.' });
    }

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
      take: 80,
      orderBy: [{ isBestSeller: 'desc' }, { sortOrder: 'asc' }],
    });

    const productsContext = products
      .map((p) => {
        const priceStr = p.isSaleActive
          ? `${p.salePrice} EGP (Sale from ${p.price} EGP)`
          : `${p.price} EGP`;
        return `- ${p.name} (${p.type}): ${priceStr}. Colors: ${(p.colors || []).join(', ')}. Sizes: ${(p.sizes || []).join(', ')}. ${p.description}`;
      })
      .join('\n');

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
${productsContext || '(No products currently in stock.)'}

User Context:
${wishlistContext}

Instructions:
- Confidently answer questions about shipping, returns, and best-sellers using the information above. NEVER say you don't have access to sales data or shipping info.
- Only recommend products from the "Current Available Catalog" list. Do NOT invent products.
- If a user asks for something we don't have, politely let them know and recommend the closest alternative we do have.
- Answer questions in English by default. If the user speaks Arabic, reply in Arabic. If the user speaks Franco-Arabic (Egyptian Arabic written in English letters, e.g. "howa eh el mawgood"), you MUST reply in Franco-Arabic.
- If you don't know the answer to something not covered here, ask them to contact support.`;

    const { text } = await generateWithFallback(ai, contents, systemPrompt);

    return res.json({
      role: 'assistant',
      content: text,
    });
  } catch (error) {
    console.error('[chatController] Error:', error?.message || error);
    const status =
      error?.status === 429 || /quota|rate/i.test(String(error?.message || ''))
        ? 429
        : 503;
    return res.status(status).json({
      message: 'Sorry, I am having trouble connecting right now. Please try again later.',
    });
  }
};

module.exports = { handleChat };
