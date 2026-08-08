/** Flip to false (or set VITE_COMING_SOON=false) when the store launches. */
export const COMING_SOON =
  import.meta.env.VITE_COMING_SOON === undefined
    ? true
    : import.meta.env.VITE_COMING_SOON !== 'false';
