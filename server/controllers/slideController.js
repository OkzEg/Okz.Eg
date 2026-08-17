const prisma = require('../lib/prisma');
const cache = require('../lib/cache');
const { uploadImage, isCloudinaryConfigured } = require('../utils/cloudinary');

const SLIDES_TTL_MS = 60_000;

const listSlides = async (req, res) => {
  try {
    const { data: slides } = await cache.wrap('slides:list', SLIDES_TTL_MS, () =>
      prisma.slide.findMany({
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          cloudinaryUrl: true,
          title: true,
          description: true,
          sortOrder: true,
        },
      })
    );
    res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120');
    res.json(slides);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createSlide = async (req, res) => {
  try {
    const { title, description, sortOrder, imageUrl, imageData } = req.body;
    let cloudinaryUrl = imageUrl?.trim() || null;

    if (req.file) {
      if (!isCloudinaryConfigured()) {
        return res.status(503).json({
          message: 'Cloudinary is not configured. Add CLOUDINARY_* env vars or paste an image URL.',
        });
      }
      const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      cloudinaryUrl = await uploadImage(dataUri, 'okz/slides');
    } else if (imageData) {
      cloudinaryUrl = await uploadImage(imageData, 'okz/slides');
    } else if (!cloudinaryUrl) {
      return res.status(400).json({ message: 'Upload an image or paste an image URL' });
    }

    const slide = await prisma.slide.create({
      data: {
        cloudinaryUrl,
        title: title || 'New Arrival',
        description: description || 'Shop the collection',
        sortOrder: sortOrder ?? 0,
      },
    });
    cache.invalidate('slides');
    res.status(201).json(slide);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateSlide = async (req, res) => {
  try {
    const data = { ...req.body };
    if (req.file) {
      if (!isCloudinaryConfigured()) {
        return res.status(503).json({
          message: 'Cloudinary is not configured. Add CLOUDINARY_* env vars or paste an image URL.',
        });
      }
      const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      data.cloudinaryUrl = await uploadImage(dataUri, 'okz/slides');
    } else if (data.imageData) {
      data.cloudinaryUrl = await uploadImage(data.imageData, 'okz/slides');
      delete data.imageData;
    }
    if (data.imageUrl) {
      data.cloudinaryUrl = data.imageUrl.trim();
      delete data.imageUrl;
    }
    delete data.image;
    const slide = await prisma.slide.update({
      where: { id: req.params.id },
      data,
    });
    cache.invalidate('slides');
    res.json(slide);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteSlide = async (req, res) => {
  try {
    await prisma.slide.delete({ where: { id: req.params.id } });
    cache.invalidate('slides');
    res.json({ message: 'Slide deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const cloudinaryStatus = async (req, res) => {
  res.json({ configured: isCloudinaryConfigured() });
};

module.exports = { listSlides, createSlide, updateSlide, deleteSlide, cloudinaryStatus };
