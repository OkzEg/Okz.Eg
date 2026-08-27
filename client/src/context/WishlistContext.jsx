import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const WishlistContext = createContext(null);

const snapshotProduct = (product) => {
  const price =
    product.isSaleActive && product.salePrice != null ? product.salePrice : product.price;
  return {
    id: product.id,
    name: product.name,
    image: product.photos?.[0] || product.image || '',
    price,
    originalPrice: product.price,
    isSaleActive: Boolean(product.isSaleActive),
    salePrice: product.salePrice ?? null,
    type: product.type,
    colors: product.colors || [],
    sizes: product.sizes || [],
    sizeStock: product.sizeStock || {},
    stock: Number(product.stock) || 0,
    photos: product.photos?.length ? product.photos : product.image ? [product.image] : [],
  };
};

export function WishlistProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('wishlistItems')) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('wishlistItems', JSON.stringify(items));
  }, [items]);

  const isSaved = (productId) => items.some((i) => i.id === productId);

  const toggle = (product) => {
    setItems((prev) => {
      if (prev.some((i) => i.id === product.id)) {
        return prev.filter((i) => i.id !== product.id);
      }
      return [...prev, snapshotProduct(product)];
    });
  };

  const remove = (productId) => {
    setItems((prev) => prev.filter((i) => i.id !== productId));
  };

  const clear = () => setItems([]);

  const replaceAll = (nextItems) => {
    setItems(Array.isArray(nextItems) ? nextItems.map(snapshotProduct) : []);
  };

  const value = useMemo(
    () => ({ items, count: items.length, isSaved, toggle, remove, clear, replaceAll }),
    [items]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export const useWishlist = () => useContext(WishlistContext);
