import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ToastNotificacion } from './toast-notificacion';

const DURACION_MS = 4000;

// Una "variante" por tipo de acción: ícono + clase de color (ver los
// ".toast-<variante>" en styles.css). crear/actualizar quedan en tonos
// positivos (verde/azul), reactivar en teal, asignar en morado, y
// eliminar/quitar en tonos de advertencia (rojo/naranja) — son acciones
// exitosas, no errores, pero vale la pena que se noten distinto.
const VARIANTES: Record<string, string> = {
  eliminar: 'delete',
  reactivar: 'restore',
  quitar: 'link_off',
  asignar: 'link',
  actualizar: 'check_circle',
  crear: 'add_circle',
};

// Reemplaza los `this.snackBar.open(mensaje, 'Cerrar', { duration: 4000 })`
// que había sueltos en ~40 pantallas: mismo mensaje, pero ahora con ícono y
// color según la acción, anclado arriba a la derecha, y una barrita que se
// va vaciando para mostrar cuánto falta para que se cierre solo.
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private snackBar = inject(MatSnackBar);

  // El ícono/color se eligen solos según palabras clave del mensaje, para
  // no tener que pasar un "tipo" aparte en cada una de las ~40 pantallas
  // que ya mandaban un mensaje fijo tipo "Creado correctamente".
  exito(mensaje: string): void {
    const variante = this.variantePara(mensaje);
    this.mostrar(mensaje, VARIANTES[variante], variante);
  }

  error(mensaje: string): void {
    this.mostrar(mensaje, 'error_outline', 'error');
  }

  private mostrar(mensaje: string, icono: string, variante: string): void {
    this.snackBar.openFromComponent(ToastNotificacion, {
      data: { mensaje, icono, duracionMs: DURACION_MS },
      duration: DURACION_MS,
      horizontalPosition: 'end',
      verticalPosition: 'top',
      panelClass: ['toast-panel', `toast-${variante}`],
    });
  }

  private variantePara(mensaje: string): string {
    const m = mensaje.toLowerCase();
    if (m.includes('eliminad')) return 'eliminar';
    if (m.includes('reactivad')) return 'reactivar';
    if (m.includes('quitad')) return 'quitar';
    if (m.includes('asignad')) return 'asignar';
    if (m.includes('actualizad')) return 'actualizar';
    return 'crear';
  }
}
