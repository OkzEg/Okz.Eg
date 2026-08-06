/** Normalize Drive / remote image URLs for <img src> */
export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('blob:') || path.startsWith('data:') || path.startsWith('http')) {
    // Google Drive share → direct view
    const driveMatch = path.match(/drive\.google\.com\/file\/d\/([^/]+)/);
    if (driveMatch) {
      return `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
    }
    const openMatch = path.match(/[?&]id=([^&]+)/);
    if (path.includes('drive.google.com') && openMatch) {
      return `https://drive.google.com/uc?export=view&id=${openMatch[1]}`;
    }
    return path;
  }
  return path;
};

export const PRODUCT_TYPES = [
  { value: 'shoe', label: 'Shoes' },
  { value: 'belt', label: 'Belts' },
  { value: 'wallet', label: 'Wallets' },
  { value: 'bundle', label: 'Bundles' },
  { value: 'shoe_lace', label: 'Shoe Laces' },
  { value: 'socks', label: 'Socks' },
];

export const formatMoney = (n) =>
  new Intl.NumberFormat('en-EG', {
    style: 'currency',
    currency: 'EGP',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);

export const orderStatusLabel = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  canceled: 'Canceled',
  problem: 'Problem',
};

export const orderStatusBadge = {
  pending: 'badge-yellow',
  confirmed: 'badge-blue',
  out_for_delivery: 'badge-wheat',
  delivered: 'badge-green',
  canceled: 'badge-gray',
  problem: 'badge-red',
};
