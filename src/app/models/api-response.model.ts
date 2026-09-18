// Envoltorio estándar de respuesta del backend real (visto por primera vez en
// el endpoint de login). Se reutiliza para cualquier endpoint que siga el
// mismo formato: { exito, mensaje, datos, errores }.

export interface ApiResponse<T> {
  exito: boolean;
  mensaje: string;
  datos: T | null;
  errores: string[] | null;
}
