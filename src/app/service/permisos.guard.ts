import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { PermisosMenuService } from './permisos-menu.service';
import { RUTA_A_MODULO } from '../shared/menu-data';

// Bloquea la navegación directa (escribir la URL a mano) a una pantalla de
// un módulo que el usuario no tiene permiso de ver, igual que ya se oculta
// en el menú lateral y en Inicio (PermisosMenuService). Si modulosPermitidos
// es null (sin permisos configurados todavía, o mientras cargan) no bloquea
// nada, por la misma razón que el menú no se oculta en ese caso: no dejar a
// nadie fuera por datos a medio configurar.
export const permisosGuard: CanActivateChildFn = (_route, state) => {
  const permisosMenu = inject(PermisosMenuService);
  const router = inject(Router);

  const permitidos = permisosMenu.modulosPermitidos();
  if (!permitidos) {
    return true;
  }

  // state.url es algo como "/home/mantenimiento/usuarios/5?foco=buscar".
  const segmentos = state.url.split('?')[0].split('/').filter(Boolean); // ['home','mantenimiento','usuarios','5']
  const [, primero, segundo] = segmentos;

  // "/home/modulo/:slug" es el overview genérico: el módulo es el propio
  // parámetro, no "modulo".
  const slug = primero === 'modulo' ? segundo : RUTA_A_MODULO[primero];

  if (!slug || permitidos.has(slug)) {
    return true;
  }
  return router.createUrlTree(['/home/inicio']);
};
