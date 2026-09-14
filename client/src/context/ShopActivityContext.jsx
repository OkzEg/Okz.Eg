import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ShopActivityContext = createContext(null);

const MAX_EVENTS = 8;

/** EU shoe sizes 40 and under (or XS/S) count as "small" for roast bait. */
export function isSmallSize(size) {
  if (size == null || size === '') return false;
  const raw = String(size).trim().toUpperCase();
  if (raw === 'XS' || raw === 'S') return true;
  const n = Number(raw.replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 && n <= 40;
}

export function ShopActivityProvider({ children }) {
  const [events, setEvents] = useState([]);
  const [pendingRoasts, setPendingRoasts] = useState([]);
  const seenOos = useRef(new Set());
  const seq = useRef(0);

  const pushEvent = useCallback((event) => {
    const id = `act_${Date.now()}_${seq.current++}`;
    const entry = { id, at: Date.now(), ...event };
    setEvents((prev) => [entry, ...prev].slice(0, MAX_EVENTS));
    if (event.roast) {
      setPendingRoasts((prev) => [...prev, entry].slice(-5));
    }
    return id;
  }, []);

  const trackSmallSizeCart = useCallback(
    ({ productName, productId, size }) => {
      if (!isSmallSize(size)) return null;
      return pushEvent({
        type: 'small_size_cart',
        roast: true,
        productName: productName || 'a product',
        productId: productId || null,
        size: String(size),
      });
    },
    [pushEvent]
  );

  const trackViewedOutOfStock = useCallback(
    ({ productName, productId }) => {
      const key = String(productId || productName || '');
      if (!key || seenOos.current.has(key)) return null;
      seenOos.current.add(key);
      return pushEvent({
        type: 'viewed_oos',
        roast: true,
        productName: productName || 'a product',
        productId: productId || null,
      });
    },
    [pushEvent]
  );

  const consumePendingRoast = useCallback(() => {
    let taken = null;
    setPendingRoasts((prev) => {
      if (!prev.length) return prev;
      taken = prev[0];
      return prev.slice(1);
    });
    // React runs this updater synchronously for this setState call.
    return taken;
  }, []);

  const value = useMemo(
    () => ({
      events,
      pendingRoasts,
      trackSmallSizeCart,
      trackViewedOutOfStock,
      consumePendingRoast,
      isSmallSize,
    }),
    [events, pendingRoasts, trackSmallSizeCart, trackViewedOutOfStock, consumePendingRoast]
  );

  return (
    <ShopActivityContext.Provider value={value}>{children}</ShopActivityContext.Provider>
  );
}

export const useShopActivity = () => useContext(ShopActivityContext);
