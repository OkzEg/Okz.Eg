/** Production shows coming soon unless VITE_COMING_SOON=false. Dev is off unless VITE_COMING_SOON=true. */
export const COMING_SOON =
  import.meta.env.VITE_COMING_SOON === 'false'
    ? false
    : import.meta.env.VITE_COMING_SOON === 'true' || import.meta.env.PROD;
