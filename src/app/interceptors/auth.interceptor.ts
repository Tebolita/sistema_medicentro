import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // En SSR/prerender no existe localStorage; el login guarda el JWT como 'token'.
  const token = typeof localStorage === 'undefined' ? null : localStorage.getItem('token');

  if (token) {
    const authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
    return next(authReq);
  }

  return next(req);
};