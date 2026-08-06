const prisma = require('../lib/prisma');
const cache = require('../lib/cache');
const { resolvePhotoLinks } = require('../utils/drivePhotos');

const serializeProduct = (p) => ({
  ...p,
  price: Number(p.price),
  salePrice: p.salePrice != null ? Number(p.salePrice) : null,
});

const PRODUCT_SELECT = {
  id: true,
  name: true,
  description: true,
  price: true,
  type: true,
  photos: true,
  colors: true,
  sizes: true,
  stock: true,
  isSaleActive: true,
  salePrice: true,
  createdAt: true,
  updatedAt: true,
};

const LIST_TTL_MS = 20_000;
const ITEM_TTL_MS = 30_000;

const bustProductCache = () => {
  cache.invalidate('products');
  cache.invalidate('product');
};

const listProducts = async (req, res) => {
  try {
    const { type, q, limit } = req.query;
    const take = Math.min(Number(limit) || 100, 100);
    const useCache = !req.headers.authorization;
    const cacheKey = `products:${type || ''}:${q || ''}:${take}`;

    const load = async () => {
      const where = {};
      if (type) where.type = type;
      if (q) {
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
        ];
      }
      const rows = await prisma.product.findMany({
        where,
        select: PRODUCT_SELECT,
        orderBy: { createdAt: 'desc' },
        take,
      });
      return rows.map(serializeProduct);
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
    res.status(500).json({ message: error.message });
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
        return row ? serializeProduct(row) : null;
      }
    );
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.set('Cache-Control', 'public, max-age=20, stale-while-revalidate=40');
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
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
      type,
      photos,
      colors,
      sizes,
      stock,
      isSaleActive,
      salePrice,
    } = req.body;
    if (!name || !description || price == null || !type) {
      return res.status(400).json({ message: 'Name, description, price, and type are required' });
    }

    const resolvedPhotos = await resolvePhotoLinks(photos || []);

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price,
        type,
        photos: resolvedPhotos,
        colors: colors || [],
        sizes: sizes || [],
        stock: stock ?? 0,
        isSaleActive: Boolean(isSaleActive),
        salePrice: salePrice || null,
      },
      select: PRODUCT_SELECT,
    });
    bustProductCache();
    res.status(201).json(serializeProduct(product));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const ALLOWED_UPDATE = [
  'name',
  'description',
  'price',
  'type',
  'photos',
  'colors',
  'sizes',
  'stock',
  'isSaleActive',
  'salePrice',
];

const updateProduct = async (req, res) => {
  try {
    const data = {};
    for (const key of ALLOWED_UPDATE) {
      if (req.body[key] !== undefined) data[key] = req.body[key];
    }
    if (data.photos) {
      data.photos = await resolvePhotoLinks(data.photos);
    }
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data,
      select: PRODUCT_SELECT,
    });
    bustProductCache();
    res.json(serializeProduct(product));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const adjustStock = async (req, res) => {
  try {
    const delta = Number(req.body.delta);
    if (!Number.isFinite(delta)) {
      return res.status(400).json({ message: 'delta must be a number' });
    }

    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: { stock: { increment: delta } },
      select: { id: true, stock: true },
    });

    if (updated.stock < 0) {
      const fixed = await prisma.product.update({
        where: { id: req.params.id },
        data: { stock: 0 },
        select: { id: true, stock: true },
      });
      bustProductCache();
      res.set('Cache-Control', 'no-store');
      return res.json(fixed);
    }

    bustProductCache();
    res.set('Cache-Control', 'no-store');
    res.json(updated);
  } catch (error) {
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
};
