const prisma = require('../lib/prisma');
const cache = require('../lib/cache');
const { resolvePhotoLinks } = require('../utils/drivePhotos');

const serializeProduct = (p, { includeCost = false } = {}) => {
  const base = {
    id: p.id,
    name: p.name,
    description: p.description,
    price: Number(p.price),
    type: p.type,
    photos: p.photos,
    colors: p.colors,
    sizes: p.sizes,
    sizeStock: p.sizeStock && typeof p.sizeStock === 'object' ? p.sizeStock : {},
    stock: p.stock,
    isSaleActive: p.isSaleActive,
    salePrice: p.salePrice != null ? Number(p.salePrice) : null,
    sortOrder: p.sortOrder,
    isBestSeller: p.isBestSeller,
    bestSellerOrder: p.bestSellerOrder,
    isHomeProduct: p.isHomeProduct,
    homeOrder: p.homeOrder,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
  if (includeCost) {
    base.cost = p.cost != null ? Number(p.cost) : 1000;
  }
  return base;
};

const normalizeSizeStock = (sizeStock) => {
  if (!sizeStock || typeof sizeStock !== 'object') return {};
  const out = {};
  for (const [key, value] of Object.entries(sizeStock)) {
    const size = String(key).trim();
    if (!size) continue;
    const qty = Number(value);
    if (Number.isFinite(qty) && qty >= 0) out[size] = Math.floor(qty);
  }
  return out;
};

const computeStock = (sizes, sizeStock, fallbackStock = 0) => {
  if (!sizes?.length) return Math.max(0, Number(fallbackStock) || 0);
  return sizes.reduce((sum, size) => sum + (Number(sizeStock?.[size]) || 0), 0);
};

const getAvailableStock = (product, size) => {
  if (product.sizes?.length && size) {
    return Number(product.sizeStock?.[size]) || 0;
  }
  return Number(product.stock) || 0;
};

const PRODUCT_SELECT = {
  id: true,
  name: true,
  description: true,
  price: true,
  cost: true,
  type: true,
  photos: true,
  colors: true,
  sizes: true,
  sizeStock: true,
  stock: true,
  isSaleActive: true,
  salePrice: true,
  sortOrder: true,
  isBestSeller: true,
  bestSellerOrder: true,
  isHomeProduct: true,
  homeOrder: true,
  createdAt: true,
  updatedAt: true,
};

const LIST_TTL_MS = 20_000;
const ITEM_TTL_MS = 30_000;

const bustProductCache = () => {
  cache.invalidate('products');
  cache.invalidate('product');
};

const toInt = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
};

const listProducts = async (req, res) => {
  try {
    const { type, q, limit, collection } = req.query;
    const take = Math.min(Number(limit) || 100, 100);
    const includeCost = req.user && ['admin', 'ops'].includes(req.user.role);
    const useCache = !includeCost;
    const cacheKey = `products:${type || ''}:${q || ''}:${take}:${collection || ''}`;

    const load = async () => {
      const where = {};
      if (type) where.type = type;
      if (collection === 'best-sellers') where.isBestSeller = true;
      if (collection === 'our-products') where.isHomeProduct = true;
      if (q) {
        const term = String(q).trim().slice(0, 80);
        where.OR = [
          { name: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
        ];
      }

      let orderBy = [{ sortOrder: 'asc' }, { createdAt: 'desc' }];
      if (collection === 'best-sellers') {
        orderBy = [{ bestSellerOrder: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }];
      } else if (collection === 'our-products') {
        orderBy = [{ homeOrder: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'desc' }];
      }

      const rows = await prisma.product.findMany({
        where,
        select: PRODUCT_SELECT,
        orderBy,
        take,
      });
      return rows.map((row) => serializeProduct(row, { includeCost }));
    };

    const products = useCache
      ? (await cache.wrap(cacheKey, LIST_TTL_MS, load)).data
      : await load();

    res.set(
      'Cache-Control',
      useCache
        ? 'public, max-age=15, stale-while-revalidate=30'
        : 'no-store'
    );
    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong' });
  }
};

const getProduct = async (req, res) => {
  try {
    const { data: product } = await cache.wrap(
      `product:${req.params.id}`,
      ITEM_TTL_MS,
      async () => {
        const row = await prisma.product.findUnique({
          where: { id: req.params.id },
          select: PRODUCT_SELECT,
        });
        return row ? serializeProduct(row, { includeCost: false }) : null;
      }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.set('Cache-Control', 'public, max-age=20, stale-while-revalidate=40');
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Something went wrong' });
  }
};

const resolvePhotos = async (req, res) => {
  try {
    const links = req.body.links || req.body.photos || [];
    const photos = await resolvePhotoLinks(links);
    res.json({ photos, count: photos.length });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

const createProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      cost,
      type,
      photos,
      colors,
      sizes,
      sizeStock,
      stock,
      isSaleActive,
      salePrice,
      sortOrder,
      isBestSeller,
      bestSellerOrder,
      isHomeProduct,
      homeOrder,
    } = req.body;
    if (!name || !description || price == null || !type) {
      return res.status(400).json({ message: 'Name, description, price, and type are required' });
    }

    const resolvedPhotos = await resolvePhotoLinks(photos || []);
    const normalizedSizes = sizes || [];
    const normalizedSizeStock = normalizeSizeStock(sizeStock);
    const totalStock = computeStock(normalizedSizes, normalizedSizeStock, stock);
    const unitCost = cost == null || cost === '' ? 1000 : Number(cost);

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        cost: Number.isFinite(unitCost) && unitCost >= 0 ? unitCost : 1000,
        type,
        photos: resolvedPhotos,
        colors: colors || [],
        sizes: normalizedSizes,
        sizeStock: normalizedSizeStock,
        stock: totalStock,
        isSaleActive: Boolean(isSaleActive),
        salePrice: salePrice || null,
        sortOrder: toInt(sortOrder, 0),
        isBestSeller: Boolean(isBestSeller),
        bestSellerOrder: toInt(bestSellerOrder, 0),
        isHomeProduct: Boolean(isHomeProduct),
        homeOrder: toInt(homeOrder, 0),
      },
      select: PRODUCT_SELECT,
    });
    bustProductCache();
    res.status(201).json(serializeProduct(product, { includeCost: true }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const ALLOWED_UPDATE = [
  'name',
  'description',
  'price',
  'cost',
  'type',
  'photos',
  'colors',
  'sizes',
  'sizeStock',
  'stock',
  'isSaleActive',
  'salePrice',
  'sortOrder',
  'isBestSeller',
  'bestSellerOrder',
  'isHomeProduct',
  'homeOrder',
];

const updateProduct = async (req, res) => {
  try {
    const data = {};
    for (const key of ALLOWED_UPDATE) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }
    if (data.cost !== undefined) {
      const unitCost = Number(data.cost);
      data.cost = Number.isFinite(unitCost) && unitCost >= 0 ? unitCost : 1000;
    }
    if (data.bestSellerOrder !== undefined) data.bestSellerOrder = toInt(data.bestSellerOrder, 0);
    if (data.homeOrder !== undefined) data.homeOrder = toInt(data.homeOrder, 0);
    if (data.isBestSeller !== undefined) data.isBestSeller = Boolean(data.isBestSeller);
    if (data.isHomeProduct !== undefined) data.isHomeProduct = Boolean(data.isHomeProduct);
    if (data.photos) {
      data.photos = await resolvePhotoLinks(data.photos);
    }
    if (data.sizeStock !== undefined) {
      data.sizeStock = normalizeSizeStock(data.sizeStock);
    }
    if (data.sizes !== undefined || data.sizeStock !== undefined || data.stock !== undefined) {
      const existing = await prisma.product.findUnique({
        where: { id: req.params.id },
        select: { sizes: true, sizeStock: true, stock: true },
      });
      const sizes = data.sizes ?? existing.sizes;
      const sizeStock = data.sizeStock ?? existing.sizeStock ?? {};
      const fallbackStock = data.stock ?? existing.stock;
      data.stock = computeStock(sizes, sizeStock, fallbackStock);
    }
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data,
      select: PRODUCT_SELECT,
    });
    bustProductCache();
    res.json(serializeProduct(product, { includeCost: true }));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const adjustStock = async (req, res) => {
  try {
    const delta = Math.trunc(Number(req.body.delta));
    const size =
      req.body.size != null && String(req.body.size).trim() !== ''
        ? String(req.body.size).trim()
        : '';
    if (!Number.isFinite(delta)) {
      return res.status(400).json({ message: 'delta must be a number' });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: req.params.id },
        select: { id: true, sizes: true, sizeStock: true, stock: true },
      });
      if (!product) return null;

      if (size) {
        if (product.sizes?.length && !product.sizes.includes(size)) {
          const err = new Error(`Unknown size ${size}`);
          err.status = 400;
          throw err;
        }
        const sizeStock = normalizeSizeStock(product.sizeStock);
        sizeStock[size] = Math.max(0, (Number(sizeStock[size]) || 0) + delta);
        const stock = computeStock(product.sizes, sizeStock, product.stock);
        return tx.product.update({
          where: { id: product.id },
          data: { sizeStock, stock },
          select: { id: true, stock: true, sizeStock: true },
        });
      }

      const stock = Math.max(0, (Number(product.stock) || 0) + delta);
      return tx.product.update({
        where: { id: product.id },
        data: { stock },
        select: { id: true, stock: true, sizeStock: true },
      });
    });

    if (!updated) {
      return res.status(404).json({ message: 'Product not found' });
    }

    bustProductCache();
    res.set('Cache-Control', 'no-store');
    res.json(updated);
  } catch (error) {
    if (error.status === 400) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message });
  }
};

const deleteProduct = async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    bustProductCache();
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  listProducts,
  getProduct,
  resolvePhotos,
  createProduct,
  updateProduct,
  adjustStock,
  deleteProduct,
  getAvailableStock,
};
