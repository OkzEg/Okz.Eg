import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../api/axios';

const CartContext = createContext(null);

const itemKey = (productId, color, size) => `${productId}-${color || ''}-${size || ''}`;

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cartItems')) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('cartItems', JSON.stringify(items));
  }, [items]);

  const addItem = (product, qty = 1, color = null, size = null) => {
    setItems((prev) => {
      const key = itemKey(product.id, color, size);
      const existing = prev.find((i) => itemKey(i.productId, i.color, i.size) === key);
      if (existing) {
        return prev.map((i) =>
          itemKey(i.productId, i.color, i.size) === key ? { ...i, qty: i.qty + qty } : i
        );
      }
      const price =
        product.isSaleActive && product.salePrice != null ? product.salePrice : product.price;
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          image: product.photos?.[0] || '',
          price,
          qty,
          color,
          size,
          stock: product.stock,
        },
      ];
    });

    // Fire and forget cart tracking
    api.post('/traffic/cart-add', {
      name: product.name,
      size,
      color,
      qty,
      price: product.isSaleActive && product.salePrice != null ? product.salePrice : product.price,
    }).catch(() => {});
  };

  const updateQty = (productId, color, size, qty) => {
    setItems((prev) =>
      prev
        .map((i) =>
          itemKey(i.productId, i.color, i.size) === itemKey(productId, color, size)
            ? { ...i, qty }
            : i
        )
        .filter((i) => i.qty > 0)
    );
  };

  const updateItem = (from, next) => {
    setItems((prev) => {
      const fromKey = itemKey(from.productId, from.color, from.size);
      const source = prev.find((i) => itemKey(i.productId, i.color, i.size) === fromKey);
      if (!source) return prev;

      const nextColor = next.color !== undefined ? next.color : source.color;
      const nextSize = next.size !== undefined ? next.size : source.size;
      const nextQty = Math.max(1, Number(next.qty ?? source.qty) || 1);
      const toKey = itemKey(source.productId, nextColor, nextSize);

      const withoutSource = prev.filter((i) => itemKey(i.productId, i.color, i.size) !== fromKey);
      const existing = withoutSource.find((i) => itemKey(i.productId, i.color, i.size) === toKey);

      if (existing) {
        return withoutSource.map((i) =>
          itemKey(i.productId, i.color, i.size) === toKey
            ? { ...i, qty: nextQty, stock: next.stock ?? i.stock }
            : i
        );
      }

      return [
        ...withoutSource,
        {
          ...source,
          color: nextColor,
          size: nextSize,
          qty: nextQty,
          stock: next.stock ?? source.stock,
          image: next.image ?? source.image,
        },
      ];
    });
  };

  const removeItem = (productId, color, size) => {
    setItems((prev) =>
      prev.filter((i) => itemKey(i.productId, i.color, i.size) !== itemKey(productId, color, size))
    );
  };

  const clear = () => setItems([]);

  const count = items.reduce((s, i) => s + i.qty, 0);
  const subtotal = items.reduce((s, i) => s + i.price * i.qty, 0);

  const value = useMemo(
    () => ({ items, addItem, updateQty, updateItem, removeItem, clear, count, subtotal }),
    [items, count, subtotal]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export const useCart = () => useContext(CartContext);
