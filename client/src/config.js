/** Flip to true (or set VITE_COMING_SOON=true) to show the coming soon page. */
export const COMING_SOON =
  import.meta.env.VITE_COMING_SOON === undefined
    ? false
    : import.meta.env.VITE_COMING_SOON === 'true';
