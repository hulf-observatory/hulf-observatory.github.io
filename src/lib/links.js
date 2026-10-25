// Addresses of the companion sites. Each has a build-time override so a local
// checkout can point at a dev server (e.g. VITE_MAPS_URL=http://127.0.0.1:8124).
const trim = (u) => u.replace(/\/$/, '');

// Spatial Data Repository (map viewer)
export const MAPS_URL = trim(import.meta.env.VITE_MAPS_URL || 'https://hyderabad.urbanobservatory.in/maps');

// City Timeline (archive maps side by side); keeps its trailing slash: it is linked as-is
export const TIMELINE_URL = trim(import.meta.env.VITE_TIMELINE_URL || 'https://hyderabad.urbanobservatory.in/timeline') + '/';

// The open-data site (catalogue, downloads). Stands in for the in-site Data Observatory page.
export const DATA_URL = (import.meta.env.VITE_DATA_URL || 'https://hyderabad.urbanobservatory.in/data') + '/';

// Tools (the former Thematic Areas "Tools" tab), at /tools/ and /stories/ under the main address (since 24 Oct 2026)
export const TOOLS_URL = trim(import.meta.env.VITE_TOOLS_URL || 'https://hyderabad.urbanobservatory.in/tools') + '/';

// Stories & datasets and the story pages, at /tools/ and /stories/ under the main address (since 24 Oct 2026)
export const STORIES_URL = trim(import.meta.env.VITE_STORIES_URL || 'https://hyderabad.urbanobservatory.in/stories') + '/';

// Live numbers computed on the observatory server (repo hulf-observatory/live-feed), served through the Cloudflare Tunnel
export const LIVE_API = trim(import.meta.env.VITE_LIVE_API || 'https://api.urbanobservatory.in/live');
