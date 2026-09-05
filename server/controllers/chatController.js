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

const lastUserText = (messages = []) => {
  const lastUser = [...messages]
    .reverse()
    .find((m) => m?.role === 'user' && String(m.content || '').trim());
  return String(lastUser?.content || '').trim();
};

const looksLikeDumbQuestion = (text = '') => {
  const t = String(text).trim();
  if (!t) return false;
  if (t.length <= 12) return true;

  const lower = t.toLowerCase();
  // Obvious / lazy / already-on-page style questions
  const dumbPatterns = [
    /^(hi|hello|hey|salam|سلام|اهلا|أهلا|ازيك|عامل ايه)\b/i,
    /\b(is it|are they|do you have|available|in stock|out of stock)\b.*\?$/i,
    /(موجود|في منه|فيه|في من|كام السعر|بكام|سعره ايه|out of stock|stock)/i,
    /^(eh|eih|ايه|ايه ده|what)\b/i,
  ];
  return dumbPatterns.some((p) => p.test(lower) || p.test(t));
};

/**
 * Swear only when the question is dumb OR the chat is long,
 * and even then only ~1/6 of the time.
 */
const shouldAllowSwear = (messages = []) => {
  const userCount = messages.filter((m) => m?.role === 'user').length;
  const text = lastUserText(messages);
  const eligible = looksLikeDumbQuestion(text) || userCount >= 6;
  if (!eligible) return false;
  return Math.random() < 1 / 6;
};

const swearDirective = (allowSwear) => {
  if (allowSwear) {
    return `SWEAR SLOT (this turn ONLY):
- You MAY use at most ONE allowed roast word in this reply.
- Allowed English: shit, dumbass, stupid, dumb
- Allowed Arabic: غبي، اهبل، عبيط، جلنف، حمار، احا
- Allowed Franco: ghabi, ahbal, 3abeet/abeet, galnaf, 7omar/homar, a7a
- Still roast + help. Do not pile on multiple swear words.`;
  }
  return `SWEAR SLOT (this turn ONLY):
- Do NOT use any swear / insult words this turn (no shit, dumbass, stupid, dumb, غبي، اهبل، عبيط، جلنف، حمار، احا، ghabi, ahbal, galnaf, 7omar, a7a).
- Stay sarcastic and funny WITHOUT swearing. Dry roast is fine.`;
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

const parseAssistantPayload = (rawText) => {
  const text = String(rawText || '').trim();
  if (!text) return { reply: '', addToCart: null };

  const tryParse = (s) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  let parsed = tryParse(text);
  if (!parsed) {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) parsed = tryParse(fenced[1].trim());
  }
  if (!parsed) {
    const brace = text.match(/\{[\s\S]*\}/);
    if (brace) parsed = tryParse(brace[0]);
  }

  if (parsed && typeof parsed === 'object') {
    return {
      reply: String(parsed.reply || parsed.message || parsed.content || '').trim(),
      addToCart: parsed.addToCart && typeof parsed.addToCart === 'object' ? parsed.addToCart : null,
    };
  }

  return { reply: text, addToCart: null };
};

const normalizeChoice = (value) => String(value || '').trim().toLowerCase();

const resolveCatalogProduct = (products, draft = {}) => {
  const id = String(draft.productId || '').trim();
  if (id) {
    const byId = products.find((p) => p.id === id);
    if (byId) return byId;
  }
  const name = String(draft.productName || '').trim().toLowerCase();
  if (!name) return null;
  const exact = products.find((p) => p.name.toLowerCase() === name);
  if (exact) return exact;
  const partial = products.find(
    (p) => p.name.toLowerCase().includes(name) || name.includes(p.name.toLowerCase())
  );
  return partial || null;
};

const availableStockFor = (product, size) => {
  if (product?.sizes?.length && size) {
    return Number(product.sizeStock?.[size]) || 0;
  }
  return Number(product?.stock) || 0;
};

const buildCartAction = (products, draft) => {
  if (!draft || typeof draft !== 'object') {
    return { cartAction: null, cartError: null };
  }

  const product = resolveCatalogProduct(products, draft);
  if (!product) {
    return { cartAction: null, cartError: 'product_not_found' };
  }

  const qty = Math.min(10, Math.max(1, Number(draft.qty) || 1));
  const needsSize = Array.isArray(product.sizes) && product.sizes.length > 0;
  const needsColor = Array.isArray(product.colors) && product.colors.length > 0;

  let size = draft.size != null && String(draft.size).trim() ? String(draft.size).trim() : null;
  let color = draft.color != null && String(draft.color).trim() ? String(draft.color).trim() : null;

  if (needsSize) {
    if (!size) return { cartAction: null, cartError: 'size_required' };
    const matchedSize = product.sizes.find((s) => normalizeChoice(s) === normalizeChoice(size));
    if (!matchedSize) return { cartAction: null, cartError: 'invalid_size' };
    size = matchedSize;
  } else {
    size = null;
  }

  if (needsColor) {
    if (!color) {
      color = product.colors[0];
    } else {
      const matchedColor = product.colors.find((c) => normalizeChoice(c) === normalizeChoice(color));
      if (!matchedColor) return { cartAction: null, cartError: 'invalid_color' };
      color = matchedColor;
    }
  } else {
    color = null;
  }

  const stock = availableStockFor(product, size);
  if (stock < 1) return { cartAction: null, cartError: 'out_of_stock' };
  if (qty > stock) return { cartAction: null, cartError: 'insufficient_stock' };

  const price =
    product.isSaleActive && product.salePrice != null
      ? Number(product.salePrice)
      : Number(product.price);

  return {
    cartAction: {
      productId: product.id,
      name: product.name,
      image: Array.isArray(product.photos) ? product.photos[0] || '' : '',
      price,
      qty,
      color,
      size,
      stock,
      isSaleActive: Boolean(product.isSaleActive),
      salePrice: product.salePrice != null ? Number(product.salePrice) : null,
      photos: product.photos || [],
    },
    cartError: null,
  };
};

const CHAT_RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    reply: {
      type: 'string',
      description: 'Customer-facing chat reply only. No JSON inside this string.',
    },
    addToCart: {
      type: 'object',
      nullable: true,
      description:
        'Set only when the customer clearly asked to add to cart AND all required details are known. Otherwise null.',
      properties: {
        productId: { type: 'string', nullable: true },
        productName: { type: 'string', nullable: true },
        size: { type: 'string', nullable: true },
        color: { type: 'string', nullable: true },
        qty: { type: 'integer', nullable: true },
      },
    },
  },
  required: ['reply'],
};

const toGeminiContents = (messages = []) => {
  const mapped = messages
    .filter((m) => m && String(m.content || '').trim())
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: String(m.content).slice(0, 1000) }],
    }));

  while (mapped.length && mapped[0].role !== 'user') mapped.shift();

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

const generateWithFallback = async (ai, contents, systemPrompt, { jsonMode = true } = {}) => {
  let lastError;
  for (const model of CHAT_MODELS) {
    try {
      const config = {
        systemInstruction: systemPrompt,
        temperature: jsonMode ? 0.75 : 0.9,
        maxOutputTokens: 700,
      };
      if (jsonMode) {
        config.responseMimeType = 'application/json';
        config.responseSchema = CHAT_RESPONSE_SCHEMA;
      }

      const response = await ai.models.generateContent({
        model,
        contents,
        config,
      });
      const raw = extractText(response);
      if (!raw) {
        lastError = new Error(`Empty response from model ${model}`);
        continue;
      }
      if (!jsonMode) return { text: raw, addToCart: null, model };

      const parsed = parseAssistantPayload(raw);
      if (parsed.reply) return { text: parsed.reply, addToCart: parsed.addToCart, model };

      lastError = new Error(`Could not parse JSON reply from model ${model}`);
    } catch (error) {
      lastError = error;
      console.warn(`[chatController] model ${model} failed:`, error?.message || error);
    }
  }
  throw lastError || new Error('All chat models failed');
};

const formatActivityContext = (activity = []) => {
  if (!Array.isArray(activity) || !activity.length) {
    return 'No special recent shop activity.';
  }
  return activity
    .slice(0, 5)
    .map((a) => {
      if (a.type === 'small_size_cart') {
        return `- Added "${a.productName}" size ${a.size} to cart (small size — roast bait).`;
      }
      if (a.type === 'viewed_oos') {
        return `- Opened out-of-stock product "${a.productName}" (roast bait).`;
      }
      return `- ${a.type}: ${a.productName || 'unknown'}`;
    })
    .join('\n');
};

const activityRoastBrief = (activityRoast = {}) => {
  if (activityRoast.type === 'small_size_cart') {
    return `TRIGGER: Customer just added "${activityRoast.productName}" in size ${activityRoast.size} (small size).
Write ONE short roast about picking a tiny size, then still be helpful (confirm it's in cart / offer similar).`;
  }
  if (activityRoast.type === 'viewed_oos') {
    return `TRIGGER: Customer just opened "${activityRoast.productName}" which is OUT OF STOCK.
Write ONE short roast about browsing something that's clearly unavailable, then suggest checking in-stock alternatives.`;
  }
  return `TRIGGER: Minor shop activity. Write one short witty aside.`;
};

const handleChat = async (req, res) => {
  try {
    const { messages, wishlist, activity, activityRoast } = req.body;
    const isActivityRoast = Boolean(activityRoast && activityRoast.type);

    if (!isActivityRoast && (!messages || !Array.isArray(messages))) {
      return res.status(400).json({ message: 'Messages array is required' });
    }

    const ai = getAiClient();
    if (!ai) {
      return res.status(503).json({
        message: 'Chat is temporarily unavailable. Please try again later.',
      });
    }

    let contents;
    if (isActivityRoast) {
      contents = [
        {
          role: 'user',
          parts: [
            {
              text: `React to this shop activity now. ${activityRoastBrief(activityRoast)}`,
            },
          ],
        },
      ];
    } else {
      contents = toGeminiContents(messages);
      if (!contents.length) {
        return res.status(400).json({ message: 'Please send a message to start the chat.' });
      }
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
        photos: true,
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
        return `- id:${p.id} | ${p.name} (${p.type}): ${priceStr}. Colors: ${(p.colors || []).join(', ') || 'n/a'}. Sizes: ${(p.sizes || []).join(', ') || 'n/a'}. Stock status: ${inStock ? 'IN STOCK' : 'OUT OF STOCK'}${sizeStock ? `. Size stock: ${sizeStock}` : ''}. ${p.description}`;
      })
      .join('\n');

    let wishlistContext = 'The user has no items in their wishlist.';
    if (wishlist && Array.isArray(wishlist) && wishlist.length > 0) {
      const wishlistNames = wishlist.map((w) => w.name || w.id).join(', ');
      wishlistContext = `The user currently has these items in their wishlist: ${wishlistNames}.`;
    }

    const activityContext = formatActivityContext(activity);
    const forcedLang = ['egyptian_arabic', 'franco', 'english'].includes(activityRoast?.language)
      ? activityRoast.language
      : null;
    const replyLanguage = forcedLang || detectReplyLanguage(messages || []);
    const allowSwear = isActivityRoast
      ? Math.random() < 1 / 6
      : shouldAllowSwear(messages || []);

    const systemPrompt = `You are the OKZ Assistant — the store's sarcastic shopping gremlin.
You ARE helpful, but you're also a witty asshole. Roast first, help second. Never actually refuse to help.

${languageDirective(replyLanguage)}

${swearDirective(allowSwear)}

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
- Swearing is RARE. Obey SWEAR SLOT above every turn. Default is NO swear words.
- When swearing is allowed, use at most ONE word from the allowed list only.
- BAN everything outside the allowed list: no fuck, bitch, ass (as slur), dick, pussy, كس، شرموطة، ابن الـ…, متناك, etc.
- Never insult the customer's money, body, family, religion, or worth as a person. Mock the QUESTION / choice / obviousness — keep small-size jokes light and playful, not cruel.
- Still push sales: recommend real products, guide to checkout, mention free shipping over 3,000 EGP when relevant.

ACTIVITY AWARENESS (only these — do NOT invent other stalking):
${activityContext}
- If recent activity includes a small-size cart add, you may tease them about tiny size energy when relevant.
- If they opened an out-of-stock product, roast that they browsed something unavailable, then steer to in-stock options.
- Do not mention activity on every reply — only when it fits.

${isActivityRoast ? `ACTIVITY ROAST MODE: Reply with ONE short message only (1–2 sentences). No preamble. ${activityRoastBrief(activityRoast)} Set addToCart to null.` : ''}

CART ACTIONS (important):
- Output MUST be JSON with fields: reply (string), addToCart (object or null).
- If the customer asks to add something to the cart and you have enough details, set addToCart.
- Required for addToCart: productId from catalog (preferred) or exact productName, plus size when the product has sizes, plus color when the product has colors (if only one color, you may fill it), qty (default 1).
- If anything required is missing, ask for it in reply and set addToCart to null.
- Never invent product ids / names / sizes / colors outside the catalog.
- Only add IN STOCK sizes. If out of stock, roast + suggest alternative, addToCart null.
- After a successful addToCart, confirm in reply that it's in the cart.

STYLE EXAMPLES (tone + language — invent fresh lines):
- AR (no swear): "في من الشوز الاسود ده؟" + out of stock → "مكتوب out of stock على الصفحة… لو عايز بديل، عندنا [product] موجود."
- AR (swear allowed): "مكتوب out of stock يا جلنف 😏 … لو عايز بديل، عندنا [product] موجود."
- AR small size: "Size 39 في الكارت؟ تمام يا نجم الأقدام الصغيرة 😏 الطلب ماشي."
- FRANCO (no swear): "maktoub out of stock 3ala el page… bas law 3ayez badil, 3andena [product] mawgood."
- EN (swear allowed): "It literally says out of stock, dumbass 😏 … closest thing we still have is [product]."
- Always end with a concrete next step when helping.

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
- Keep answers short (2–5 sentences max unless listing options). Activity roasts: 1–2 sentences max.
- Never break character into a corporate polite bot.
- Obey REPLY LANGUAGE LOCK and SWEAR SLOT above with zero exceptions.`;

    const { text, addToCart } = await generateWithFallback(ai, contents, systemPrompt, {
      jsonMode: true,
    });

    let cartAction = null;
    let cartError = null;
    if (!isActivityRoast && addToCart) {
      ({ cartAction, cartError } = buildCartAction(products, addToCart));
    }

    return res.json({
      role: 'assistant',
      content: text,
      detectedLanguage: replyLanguage,
      cartAction,
      cartError,
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
