const prisma = require('../lib/prisma');
const cache = require('../lib/cache');
const { uploadImage, isCloudinaryConfigured } = require('../utils/cloudinary');

const SLIDES_TTL_MS = 60_000;

const slideListQuery = () =>
  prisma.slide.findMany({
    orderBy: { sortOrder: 'asc' },
    select: {
      id: true,
      cloudinaryUrl: true,
      width: true,
      height: true,
      title: true,
      description: true,
      sortOrder: true,
    },
  });

const listSlides = async (req, res) => {
  try {
    const isAuthed = Boolean(req.headers.authorization);
    const slides = isAuthed
      ? await slideListQuery()
      : (await cache.wrap('slides:list', SLIDES_TTL_MS, slideListQuery)).data;

    res.set(
      'Cache-Control',
      isAuthed
        ? 'private, no-store'
        : 'public, max-age=60, stale-while-revalidate=120'
    );
    res.json(slides);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createSlide = async (req, res) => {
  try {
    const { title, description, sortOrder, imageUrl, imageData } = req.body;
    let cloudinaryUrl = imageUrl?.trim() || null;
    let width = null;
    let height = null;

    if (req.file) {
      if (!isCloudinaryConfigured()) {
        return res.status(503).json({
          message: 'Cloudinary is not configured. Add CLOUDINARY_* env vars or paste an image URL.',
        });
      }
      const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const uploaded = await uploadImage(dataUri, 'okz/slides');
      cloudinaryUrl = uploaded.url;
      width = uploaded.width;
      height = uploaded.height;
    } else if (imageData) {
      if (!isCloudinaryConfigured()) {
        return res.status(503).json({
          message: 'Cloudinary is not configured. Add CLOUDINARY_* env vars or paste an image URL.',
        });
      }
      const uploaded = await uploadImage(imageData, 'okz/slides');
      cloudinaryUrl = uploaded.url;
      width = uploaded.width;
      height = uploaded.height;
    } else if (!cloudinaryUrl) {
      return res.status(400).json({ message: 'Upload an image or paste an image URL' });
    }

    const slide = await prisma.slide.create({
      data: {
        cloudinaryUrl,
        width,
        height,
        title: title?.trim() || 'New Arrival',
        description: description?.trim() || 'Shop the collection',
        sortOrder: Number(sortOrder) || 0,
      },
    });
    cache.invalidate('slides');
    res.status(201).json(slide);
  } catch (error) {
    console.error('createSlide failed:', error);
    res.status(500).json({ message: error.message || 'Failed to save slide' });
  }
};

const updateSlide = async (req, res) => {
  try {
    const { title, description, sortOrder, imageUrl, imageData } = req.body;
    const data = {};

    if (title !== undefined) data.title = String(title).trim() || 'New Arrival';
    if (description !== undefined) data.description = String(description).trim() || 'Shop the collection';
    if (sortOrder !== undefined) data.sortOrder = Number(sortOrder) || 0;

    if (req.file) {
      if (!isCloudinaryConfigured()) {
        return res.status(503).json({
          message: 'Cloudinary is not configured. Add CLOUDINARY_* env vars or paste an image URL.',
        });
      }
      const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      const uploaded = await uploadImage(dataUri, 'okz/slides');
      data.cloudinaryUrl = uploaded.url;
      data.width = uploaded.width;
      data.height = uploaded.height;
    } else if (imageData) {
      if (!isCloudinaryConfigured()) {
        return res.status(503).json({
          message: 'Cloudinary is not configured. Add CLOUDINARY_* env vars or paste an image URL.',
        });
      }
      const uploaded = await uploadImage(imageData, 'okz/slides');
      data.cloudinaryUrl = uploaded.url;
      data.width = uploaded.width;
      data.height = uploaded.height;
    } else if (imageUrl) {
      data.cloudinaryUrl = String(imageUrl).trim();
      data.width = null;
      data.height = null;
    }

    const slide = await prisma.slide.update({
      where: { id: req.params.id },
      data,
    });
    cache.invalidate('slides');
    res.json(slide);
  } catch (error) {
    console.error('updateSlide failed:', error);
    res.status(500).json({ message: error.message || 'Failed to update slide' });
  }
};

const deleteSlide = async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    if (!id) {
      return res.status(400).json({ message: 'Slide id required' });
    }

    // deleteMany is idempotent: a missing row is not an error (Prisma delete throws P2025).
    await prisma.slide.deleteMany({ where: { id } });
    cache.invalidate('slides');
    res.set('Cache-Control', 'no-store');
    res.json({ message: 'Slide deleted' });
  } catch (error) {
    console.error('deleteSlide failed:', error);
    res.status(500).json({ message: error.message || 'Failed to delete slide' });
  }
};

const cloudinaryStatus = async (req, res) => {
  res.json({ configured: isCloudinaryConfigured() });
};

module.exports = { listSlides, createSlide, updateSlide, deleteSlide, cloudinaryStatus };
