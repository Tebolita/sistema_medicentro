import { Component, inject } from '@angular/core';
import { MAT_SNACK_BAR_DATA, MatSnackBarRef } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface ToastData {
  mensaje: string;
  icono: string;
  duracionMs: number;
}

// Contenido visual del toast — NotificacionesService lo abre con
// openFromComponent() en vez de snackBar.open(texto) porque el open()
// simple de Material no tiene forma de meterle un ícono ni la barrita de
// tiempo de abajo.
@Component({
  selector: 'app-toast-notificacion',
  imports: [MatIconModule, MatButtonModule],
  template: `
    <div class="toast-fila">
      <mat-icon class="toast-icono">{{ data.icono }}</mat-icon>
      <span class="toast-mensaje">{{ data.mensaje }}</span>
      <button matIconButton (click)="snackBarRef.dismiss()" aria-label="Cerrar">
        <mat-icon class="toast-cerrar">close</mat-icon>
      </button>
    </div>
    <div class="toast-barra-fondo">
      <div class="toast-barra" [style.animation-duration.ms]="data.duracionMs"></div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }

      .toast-fila {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
      }

      .toast-mensaje {
        flex: 1;
        font-size: 13.5px;
        font-weight: 500;
      }

      .toast-icono {
        flex-shrink: 0;
      }

      .toast-cerrar {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      /* Barrita que se va vaciando de izquierda a derecha mientras el toast
         sigue abierto — da una idea de cuánto falta para que se cierre solo. */
      .toast-barra-fondo {
        margin-top: 8px;
        height: 3px;
        border-radius: 2px;
        background: rgba(255, 255, 255, 0.25);
        overflow: hidden;
      }

      .toast-barra {
        height: 100%;
        width: 100%;
        background: rgba(255, 255, 255, 0.85);
        transform-origin: left;
        animation-name: toast-vaciar;
        animation-timing-function: linear;
        animation-fill-mode: forwards;
      }

      @keyframes toast-vaciar {
        from {
          transform: scaleX(1);
        }
        to {
          transform: scaleX(0);
        }
      }
    `,
  ],
})
export class ToastNotificacion {
  data = inject<ToastData>(MAT_SNACK_BAR_DATA);
  snackBarRef = inject(MatSnackBarRef<ToastNotificacion>);
}
