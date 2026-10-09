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
    path: 'home/polizas/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'home/expedientes/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'home/laboratorio/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'home/emergencias/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'home/emergencias/compromisos/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'home/hospitalizacion/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'home/farmacia/medicamentos/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'home/farmacia/item/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'home/farmacia/recetas/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'home/facturacion/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'home/mantenimiento/proveedores/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'home/mantenimiento/convenios/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'home/mantenimiento/usuarios/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'home/mantenimiento/roles/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'home/mantenimiento/puestos/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'home/mantenimiento/especialidades/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'home/mantenimiento/empleados/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'home/mantenimiento/permisos/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'home/mantenimiento/aseguradoras/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'home/mantenimiento/salas/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'home/mantenimiento/habitaciones/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'home/mantenimiento/tipos-consentimiento/:id',
    renderMode: RenderMode.Client
  },
  {
    path: 'home/mantenimiento/tipos-examen/:id',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
