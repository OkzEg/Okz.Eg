const { GoogleGenAI } = require('@google/genai');
const prisma = require('../lib/prisma');

const CHAT_MODELS = [
  process.env.GEMINI_MODEL,
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-flash-latest',
].filter(Boolean);

const detectReplyLanguage = (messages = []) => {
  const lastUser = [...messages].reverse().find((m) => m?.role === 'user' && String(m.content || '').trim());
  const text = String(lastUser?.content || '').trim();
  if (!text) return 'english';

  const hasArabicScript = /[\u0600-\u06FF]/.test(text);
  if (hasArabicScript) return 'egyptian_arabic';

  // Latin letters that look like Egyptian Arabizi / Franco (common markers).
  const lower = text.toLowerCase();
  const francoHints =
    /\b(el|al|fe|fi|leh|3ayez|3ayz|msh|mish|ya|wallahy|wallahi|bas|keda|kda|awl|awel|shohoz|shooz|bkam|kam|floos|flous|tawseel|tawsil|gamed|gameed|yala|yalla|sa7by|asa7by|habibi|aslan|tab|tayeb|tyb|eh|eih|3ashan|ashan|7aga|mn|men|deh|dah|di|dy|mawgood|maktoub|galnaf|odam)\b/i.test(
      lower
    ) || /[2379]/.test(lower); // Arabizi digits: 3ayn, 7aa, 2alif, 9af

  // Mostly Latin without Franco markers → English.
  if (/[a-z]/i.test(text) && francoHints) return 'franco';
  if (/[a-z]/i.test(text)) return 'english';
  return 'english';
};

const languageDirective = (mode) => {
  if (mode === 'egyptian_arabic') {
    return `REPLY LANGUAGE LOCK (mandatory for THIS message):
- The customer wrote Egyptian Arabic script.
- Reply ONLY in Egyptian Arabic عامية (not فصحى).
- Do NOT reply in English or Franco. Product names may stay in English.`;
  }
  if (mode === 'franco') {
    return `REPLY LANGUAGE LOCK (mandatory for THIS message):
- The customer wrote Franco / Arabizi (Egyptian Arabic in Latin letters).
- Reply ONLY in Franco/Arabizi (e.g. "maktoub out of stock ya galnaf").
- Do NOT switch to Arabic script or full English sentences. Product names may stay in English.`;
  }
  return `REPLY LANGUAGE LOCK (mandatory for THIS message):
- The customer wrote English.
- Reply ONLY in English.
- Do NOT reply in Arabic script or Franco.`;
};

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

    const replyLanguage = detectReplyLanguage(messages);

    const systemPrompt = `You are the OKZ Assistant — the store's sarcastic shopping gremlin.
You ARE helpful, but you're also a witty asshole. Roast first, help second. Never actually refuse to help.

${languageDirective(replyLanguage)}

LANGUAGE RULES (always):
1) English message → English reply.
2) Arabic script → Egyptian Arabic reply (عامية).
3) Franco / Arabizi (Latin Egyptian, e.g. "fe mn el shohoz el sood?") → Franco reply.
4) Never mix languages in one reply except product names / "out of stock" / brand words.
5) Never use formal فصحى unless the customer did.
6) Match the LATEST user message language, even if earlier turns were different.

PERSONALITY:
- Helpful jerk with sharp Egyptian street humor. Dry, savage, playful — never cruel about identity, looks, religion, politics, or trauma.
- Roast dumb / obvious / lazy questions, then immediately give the useful answer.
- Short replies. Punchy. Like a friend who dunks on you then solves the problem.
- ALLOWED roast words ONLY (use these freely when roasting):
  - English: shit, dumbass, stupid, dumb
  - Arabic: غبي، اهبل، عبيط، جلنف، حمار
  - Franco (same Arabic insults, Latin spelling): ghabi, ahbal, 3abeet/abeet, galnaf, 7omar/homar
- BAN everything else: no fuck, bitch, ass (as slur), dick, pussy, كس، شرموطة، ابن الـ…, متناك, etc. Stay inside the allowed list.
- Never insult the customer's money, body, family, religion, or worth as a person. Mock the QUESTION or the obviousness — not who they are.
- Still push sales: recommend real products, guide to checkout, mention free shipping over 3,000 EGP when relevant.

STYLE EXAMPLES (tone + language — invent fresh lines):
- AR: "في من الشوز الاسود ده؟" + out of stock → "مكتوب out of stock يا جلنف 😏 … لو عايز بديل، عندنا [product] موجود."
- FRANCO: "fe mn el shohoz el sood?" + out of stock → "maktoub out of stock ya galnaf 😏 … bas law 3ayez badil, 3andena [product] mawgood."
- EN: "Do you have this black shoe?" + out of stock → "It literally says out of stock, dumbass 😏 … closest thing we still have is [product]."
- Always end the roast with a concrete next step.

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
- Never break character into a corporate polite bot.
- Obey REPLY LANGUAGE LOCK above with zero exceptions.`;

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
