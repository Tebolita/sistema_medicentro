import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { AuthService } from './auth.service';

// Bloquea /home y todas sus hijas si no hay un token de sesión guardado (o
// ya venció): antes cualquiera podía entrar escribiendo la URL a mano, sin
// loguearse (la API sí rechaza las peticiones con 401, pero la pantalla, el
// menú y los formularios se veían igual). Esto no reemplaza la seguridad
// real, que vive en el backend — ver reporte de seguridad —, pero cierra la
// fuga de estructura del lado del cliente.
export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const authService = inject(AuthService);

  // En SSR/prerender no hay localStorage ni sesión real: dejar pasar para
  // que la ruta prerenderice, igual que hacían los demás guards del sistema.
  if (!isPlatformBrowser(inject(PLATFORM_ID))) {
    return true;
  }

  if (authService.tieneSesionValida()) {
    return true;
  }

  // Mismo query param que ya usa auth.interceptor.ts para un 401 a mitad de
  // sesión, así el login muestra el mismo aviso en los dos casos.
  return router.createUrlTree(['/'], { queryParams: { sesionVencida: '1' } });
};
