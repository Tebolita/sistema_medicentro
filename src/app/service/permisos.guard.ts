import { PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { toObservable } from '@angular/core/rxjs-interop';
import { CanActivateChildFn, Router } from '@angular/router';
import { filter, map, take } from 'rxjs';
import { PermisosMenuService } from './permisos-menu.service';
import { RUTA_A_MODULO } from '../shared/menu-data';

// Bloquea la navegación directa (escribir la URL a mano) a una pantalla de
// un módulo que el usuario no tiene permiso de ver, igual que ya se oculta
// en el menú lateral y en Inicio (PermisosMenuService). Si los permisos
// todavía se están cargando (p. ej. al recargar la página), espera a que
// terminen antes de decidir. Inicio y Mi cuenta no pertenecen a ningún
// módulo y siempre se permiten.
export const permisosGuard: CanActivateChildFn = (_route, state) => {
  // En el prerender (servidor) no hay sesión ni permisos que consultar.
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true;
  }

  const permisosMenu = inject(PermisosMenuService);
  const router = inject(Router);

  // state.url es algo como "/home/mantenimiento/usuarios/5?foco=buscar".
  const segmentos = state.url.split('?')[0].split('/').filter(Boolean); // ['home','mantenimiento','usuarios','5']
  const [, primero, segundo] = segmentos;

  // "/home/modulo/:slug" es el overview genérico: el módulo es el propio
  // parámetro, no "modulo".
  const slug = primero === 'modulo' ? segundo : RUTA_A_MODULO[primero];
  if (!slug) {
    return true;
  }

  const decidir = (permitidos: Set<string>) => permitidos.has(slug) || router.createUrlTree(['/home/inicio']);

  const permitidos = permisosMenu.modulosPermitidos();
  if (permitidos) {
    return decidir(permitidos);
  }
  return toObservable(permisosMenu.modulosPermitidos).pipe(
    filter((p): p is Set<string> => p !== null),
    take(1),
    map(decidir),
  );
};
