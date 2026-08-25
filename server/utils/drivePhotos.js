const IMAGE_MIME = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/heic',
  'image/heif',
]);

const IMAGE_EXT = /\.(jpe?g|png|webp|gif|bmp|heic|heif)$/i;

const fileViewUrl = (id) => `https://lh3.googleusercontent.com/d/${id}`;

const extractFolderId = (url) => {
  if (!url) return null;
  const folder = url.match(/drive\.google\.com\/(?:drive\/)?(?:u\/\d+\/)?folders\/([a-zA-Z0-9_-]+)/);
  if (folder) return folder[1];
  const open = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
  return open ? open[1] : null;
};

const extractFileId = (url) => {
  if (!url) return null;
  const file = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (file) return file[1];
  if (url.includes('drive.google.com') && /[?&]id=/.test(url)) {
    const id = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    return id ? id[1] : null;
  }
  return null;
};

const isDriveFolderUrl = (url) => Boolean(extractFolderId(url));

const listFolderViaApi = async (folderId) => {
  const key = process.env.GOOGLE_DRIVE_API_KEY;
  if (!key) return null;

  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const fields = encodeURIComponent('files(id,name,mimeType)');
  const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&pageSize=100&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Drive API error (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return (data.files || [])
    .filter(
      (f) =>
        IMAGE_MIME.has(f.mimeType) ||
        f.mimeType === 'application/vnd.google-apps.photo' ||
        IMAGE_EXT.test(f.name || '')
    )
    .map((f) => fileViewUrl(f.id));
};

const listFolderViaEmbed = async (folderId) => {
  const url = `https://drive.google.com/embeddedfolderview?id=${folderId}#list`;
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html',
    },
  });
  if (!res.ok) {
    throw new Error(
      'Could not read Drive folder. Make sure it is shared as “Anyone with the link”, or set GOOGLE_DRIVE_API_KEY.'
    );
  }
  const html = await res.text();
  const ids = new Set();

  for (const match of html.matchAll(/\/file\/d\/([a-zA-Z0-9_-]+)/g)) {
    ids.add(match[1]);
  }
  for (const match of html.matchAll(/\[null,"([a-zA-Z0-9_-]{20,})",\["[^"]*"\]/g)) {
    ids.add(match[1]);
  }
  for (const match of html.matchAll(/data-id="([a-zA-Z0-9_-]{20,})"/g)) {
    ids.add(match[1]);
  }

  const imageIds = [];
  for (const id of ids) {
    const idx = html.indexOf(id);
    const slice = html.slice(Math.max(0, idx - 80), idx + 120);
    if (IMAGE_EXT.test(slice) || /image\//i.test(slice) || ids.size <= 40) {
      imageIds.push(id);
    }
  }

  const finalIds = imageIds.length ? imageIds : [...ids];
  return [...new Set(finalIds)].map(fileViewUrl);
};

const listFolderImages = async (folderId) => {
  try {
    const viaApi = await listFolderViaApi(folderId);
    if (viaApi && viaApi.length) return viaApi;
  } catch (err) {
    console.warn('Drive API folder list failed, trying embed:', err.message);
  }
  return listFolderViaEmbed(folderId);
};

const resolvePhotoLinks = async (links = []) => {
  const input = Array.isArray(links) ? links : String(links).split(/[\n,]+/);
  const cleaned = input.map((s) => String(s).trim()).filter(Boolean);
  const out = [];
  const seen = new Set();

  for (const link of cleaned) {
    if (isDriveFolderUrl(link)) {
      const folderId = extractFolderId(link);
      const files = await listFolderImages(folderId);
      if (!files.length) {
        throw new Error(
          'No images found in that Drive folder. Share it as “Anyone with the link” and include image files.'
        );
      }
      for (const url of files) {
        if (!seen.has(url)) {
          seen.add(url);
          out.push(url);
        }
      }
      continue;
    }

    const fileId = extractFileId(link);
    const normalized = fileId ? fileViewUrl(fileId) : link;
    if (!seen.has(normalized)) {
      seen.add(normalized);
      out.push(normalized);
    }
  }

  return out;
};

module.exports = {
  resolvePhotoLinks,
  isDriveFolderUrl,
  extractFolderId,
  fileViewUrl,
};
