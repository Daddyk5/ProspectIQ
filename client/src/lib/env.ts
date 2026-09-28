const raw = import.meta.env;

const apiBaseUrl = (raw.VITE_API_BASE_URL ?? '').replace(/\/$/, '');

function deriveWsUrl(): string {
  if (raw.VITE_WS_URL) return raw.VITE_WS_URL;
  if (apiBaseUrl) return `${apiBaseUrl.replace(/^http/, 'ws')}/ws`;
  if (typeof location === 'undefined') return 'ws://localhost:5173/ws';
  return `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`;
}

export const env = {
  apiBaseUrl,
  wsUrl: deriveWsUrl(),
  googleMapsApiKey: raw.VITE_GOOGLE_MAPS_API_KEY ?? '',
  googleMapsMapId: raw.VITE_GOOGLE_MAPS_MAP_ID ?? '',
  welcomeVideoUrl: raw.VITE_WELCOME_VIDEO_URL || '/media/prospectiq-welcome.mp4',
};
