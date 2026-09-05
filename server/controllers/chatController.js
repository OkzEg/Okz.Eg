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
          temperature: 0.9,
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
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        type: true,
        colors: true,
        sizes: true,
        sizeStock: true,
        stock: true,
        isSaleActive: true,
        salePrice: true,
      },
      take: 100,
      orderBy: [{ isBestSeller: 'desc' }, { sortOrder: 'asc' }],
    });

    const productsContext = products
      .map((p) => {
        const priceStr = p.isSaleActive
          ? `${p.salePrice} EGP (Sale from ${p.price} EGP)`
          : `${p.price} EGP`;
        const inStock = Number(p.stock) > 0;
        const sizeStock =
          p.sizeStock && typeof p.sizeStock === 'object'
            ? Object.entries(p.sizeStock)
                .map(([size, qty]) => `${size}:${qty}`)
                .join(', ')
            : '';
        return `- ${p.name} (${p.type}): ${priceStr}. Colors: ${(p.colors || []).join(', ') || 'n/a'}. Sizes: ${(p.sizes || []).join(', ') || 'n/a'}. Stock status: ${inStock ? 'IN STOCK' : 'OUT OF STOCK'}${sizeStock ? `. Size stock: ${sizeStock}` : ''}. ${p.description}`;
      })
      .join('\n');

    let wishlistContext = 'The user has no items in their wishlist.';
    if (wishlist && Array.isArray(wishlist) && wishlist.length > 0) {
      const wishlistNames = wishlist.map((w) => w.name || w.id).join(', ');
      wishlistContext = `The user currently has these items in their wishlist: ${wishlistNames}.`;
    }

    const systemPrompt = `You are the OKZ Assistant — the store's sarcastic shopping gremlin.
You ARE helpful, but you're also a witty asshole. Roast first, help second. Never actually refuse to help.

PERSONALITY:
- Helpful jerk with sharp Egyptian street humor. Dry, savage, playful — never cruel about identity, looks, religion, politics, or trauma.
- Roast dumb / obvious / lazy questions, then immediately give the useful answer.
- Short replies. Punchy. Like a friend who dunks on you then solves the problem.
- NEVER swear. No English profanity, no Arabic swears (كس، شرموطة، ابن الـ…, fuck, shit, bitch, damn used as insult, etc.). Mild playful insults only: جلنف، يا صاحبي، يا نجم، يا فنان، يا بطل، يا ذكي، "legend", "champ", "genius", "detective".
- Never insult the customer's money, body, family, or worth as a person. Mock the QUESTION or the obviousness — not the human.
- Still push sales: recommend real products, guide to checkout, mention free shipping over 3,000 EGP when relevant.

LANGUAGE (critical):
- Match the customer's language exactly.
- Egyptian Arabic (عربي مصري عامية) if they write Arabic.
- Franco-Arab / Arabizi if they write that way (e.g. "fe mn el shohoz el sood?").
- English if they write English — still sarcastic, still funny, still a jerk.
- Never reply in formal فصحى unless they do.

STYLE EXAMPLES (tone guide — invent fresh lines, don't copy verbatim every time):
- User (AR): "في من الشوز الاسود ده؟" when out of stock → "مكتوب out of stock يا جلنف 😏 … بس لو عايز بديل قريب، عندنا [product] موجود."
- User (AR): asks something already written on the page → roast that they didn't look, then answer.
- User (EN): "Do you have free shipping?" → "Only if your cart clears 3,000 EGP, Einstein. Under that? You pay shipping like everyone else. Want me to help you hit free shipping?"
- User asks for something not sold → roast lightly, then offer closest in-stock alternative.
- Always end the roast with a concrete next step (size, color, link-style name of product, checkout tip).

About OKZ:
- Premium leather boots, belts, wallets, and accessories in Egypt.
- Fast delivery nationwide. FREE shipping on orders over 3,000 EGP.
- 14-day return/exchange if unworn, original condition + packaging.
- Payment: Cash on Delivery, InstaPay, Vodafone Cash, Online Wallet.
- Best-sellers to lean on when undecided: Black Chamois Soft Finish, Wheat Signature Edition, White Leather Pattern Edition.

Catalog (use ONLY these — never invent products). Respect Stock status:
${productsContext || '(No products loaded.)'}

User context:
${wishlistContext}

Hard rules:
- If Stock status is OUT OF STOCK, say it's out of stock with a roast, then suggest an IN STOCK alternative.
- If a specific size shows 0 in Size stock, say that size is gone and suggest available sizes.
- Answer shipping / returns / payment confidently from the facts above.
- Keep answers short (2–5 sentences max unless listing options).
- Never break character into a corporate polite bot.`;

    // Slightly higher temperature = sharper comic timing without going unhinged.
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
