import { inject } from '@angular/core';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // En SSR/prerender no existe localStorage; el login guarda el JWT como 'token'.
  const token = typeof localStorage === 'undefined' ? null : localStorage.getItem('token');

  if (!token) {
    return next(req);
  }

  const authReq = req.clone({
    headers: req.headers.set('Authorization', `Bearer ${token}`),
  });

  const router = inject(Router);

  return next(authReq).pipe(
    catchError((error: unknown) => {
      // Solo si YA mandábamos un token: un 401 aquí es la sesión vencida o
      // inválida, no una credencial incorrecta (eso sale de /Auth/login, que
      // nunca manda token porque todavía no existe sesión — no cae en este
      // if). Limpiar y mandar a login evita quedarse pegado viendo errores
      // en cada pantalla hasta que el usuario entienda que debe reloguear.
      if (error instanceof HttpErrorResponse && error.status === 401) {
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('id_usuario');
        } catch {}
        router.navigate(['/'], { queryParams: { sesionVencida: '1' } });
      }
      return throwError(() => error);
    }),
  );
};
