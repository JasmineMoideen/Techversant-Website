/** Maps a WordPress uploads path to the locally mirrored copy (see scripts/mirror-assets.ts). */
export const asset = (path: string) => `/wp-assets${path.startsWith("/") ? path : `/${path}`}`;
export const upload = (path: string) => asset(`/wp-content/uploads/${path}`);
