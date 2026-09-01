import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'home/modulo/:slug',
    renderMode: RenderMode.Client
  },
  {
    path: 'home/pacientes/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'home/consultas/:id',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
