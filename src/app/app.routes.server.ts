import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    // Authenticated, timer-driven dashboard: render in the browser so every
    // screen's loading state runs against live data instead of a static snapshot.
    path: '**',
    renderMode: RenderMode.Client,
  },
];
