export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('blob:') || path.startsWith('data:')) return path;

  const isDriveRelated =
    /drive\.google\.com|drive\.usercontent\.google\.com|lh3\.googleusercontent\.com\/d\//.test(
      path
    );

  if (isDriveRelated) {
    const id =
      path.match(/\/file\/d\/([^/?&#]+)/)?.[1] ||
      path.match(/lh3\.googleusercontent\.com\/d\/([^?=&#]+)/)?.[1] ||
      path.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];
    if (id) return `https://lh3.googleusercontent.com/d/${id}`;
  }

  if (path.startsWith('http')) return path;
  return path;
};

export const optimizeImageUrl = (path, { width = 800, quality = 'auto' } = {}) => {
  const url = getImageUrl(path);
  if (!url || !url.includes('res.cloudinary.com/image/upload/')) return url;

  const tx = `f_auto,q_${quality},w_${width},c_limit,dpr_auto`;
  const [prefix, rest] = url.split('/upload/');
  if (!rest || rest.startsWith(`${tx}/`)) return url;
  return `${prefix}/upload/${tx}/${rest}`;
};

export const getSlideAspectRatio = (slide) => {
  const w = Number(slide?.width);
  const h = Number(slide?.height);
  if (w > 0 && h > 0) return w / h;
  return null;
};

export const preloadImage = (src) =>
  new Promise((resolve, reject) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

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

export const FREE_SHIPPING_MIN = 3000;
export const SHIPPING_FEE_CAIRO_GIZA = 80;
export const SHIPPING_FEE_OTHER = 110;

export const PAYMENT_METHODS = [
  {
    value: 'Cash on Delivery',
    label: 'الدفع عند الاستلام (COD)',
    hint: 'موصى به — ادفع كاش للمندوب بعد ما تفحص المنتج',
  },
  {
    value: 'InstaPay',
    label: 'InstaPay',
    hint: 'حوّل عبر إنستاباي ثم ارفع صورة الإيصال قبل تأكيد الطلب',
  },
  {
    value: 'Online Wallet',
    label: 'Online Wallet',
    hint: 'حوّل عبر المحفظة ثم ارفع صورة الإيصال قبل تأكيد الطلب',
  },
];

export const DIGITAL_PAYMENT_METHODS = ['InstaPay', 'Online Wallet', 'Vodafone Cash'];

export const isDigitalPayment = (method) => DIGITAL_PAYMENT_METHODS.includes(method);

export const INSTAPAY_HANDLE = String(
  import.meta.env.VITE_INSTAPAY_HANDLE || 'https://ipn.eg/S/omarhazm04/instapay/4CZCDb'
).trim();
export const INSTAPAY_URL = /^https?:\/\//i.test(INSTAPAY_HANDLE) ? INSTAPAY_HANDLE : '';
export const ONLINE_WALLET_NUMBER = String(
  import.meta.env.VITE_ONLINE_WALLET_NUMBER ||
    import.meta.env.VITE_VODAFONE_CASH_NUMBER ||
    ''
).trim();
export const VODAFONE_CASH_NUMBER = ONLINE_WALLET_NUMBER;

export const shippingFeeForGovernorate = (governorate) => {
  const value = String(governorate || '').trim().toLowerCase();
  if (value === 'cairo' || value === 'giza') return SHIPPING_FEE_CAIRO_GIZA;
  return SHIPPING_FEE_OTHER;
};

export const calcShipping = (subtotal, governorate) => {
  if (Number(subtotal) >= FREE_SHIPPING_MIN || Number(subtotal) === 0) return 0;
  return shippingFeeForGovernorate(governorate);
};

export const EGYPT_GOVERNORATES = [
  'Cairo',
  'Giza',
  'Alexandria',
  'Dakahlia',
  'Red Sea',
  'Beheira',
  'Fayoum',
  'Gharbia',
  'Ismailia',
  'Menofia',
  'Minya',
  'Qalyubia',
  'New Valley',
  'Suez',
  'Aswan',
  'Assiut',
  'Beni Suef',
  'Port Said',
  'Damietta',
  'Sharqia',
  'South Sinai',
  'Kafr El Sheikh',
  'Matrouh',
  'Luxor',
  'Qena',
  'North Sinai',
  'Sohag',
];

export const getAvailableStock = (product, size) => {
  if (product?.sizes?.length && size) {
    return Number(product.sizeStock?.[size]) || 0;
  }
  return Number(product?.stock) || 0;
};

export const parseSizes = (value) =>
  String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const orderStatusLabel = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  canceled: 'Canceled',
  problem: 'Problem',
};

export const customerOrderStatusLabel = {
  pending: 'Order received',
  confirmed: 'Confirmed',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  canceled: 'Canceled',
  problem: 'In review',
};

export const orderStatusBadge = {
  pending: 'badge-yellow',
  confirmed: 'badge-blue',
  out_for_delivery: 'badge-wheat',
  delivered: 'badge-green',
  canceled: 'badge-gray',
  problem: 'badge-red',
};

export const customerOrderStatusBadge = {
  pending: 'badge-blue',
  confirmed: 'badge-blue',
  out_for_delivery: 'badge-wheat',
  delivered: 'badge-green',
  canceled: 'badge-gray',
  problem: 'badge-yellow',
};
