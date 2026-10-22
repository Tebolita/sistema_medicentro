import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmacionData {
  mensaje: string;
  titulo: string;
  textoConfirmar: string;
  textoCancelar: string;
  peligroso: boolean;
}

// Reemplaza el confirm() nativo del navegador (ver reporte de bugs, B-21:
// "eliminar usa un aviso rojo, y dar de baja usa la confirmación nativa" —
// mismo problema de fondo que ya se resolvió para las notificaciones con
// NotificacionesService, ahora para las confirmaciones). El backdrop de
// MatDialog ya cubre toda la pantalla y bloquea la interacción con lo de
// atrás, que es justo el efecto de "alerta flotante" pedido.
@Component({
  selector: 'app-confirmacion-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './confirmacion-dialog.html',
  styleUrl: './confirmacion-dialog.css',
})
export class ConfirmacionDialog {
  data = inject<ConfirmacionData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ConfirmacionDialog>);

  cancelar(): void {
    this.dialogRef.close(false);
  }

  confirmar(): void {
    this.dialogRef.close(true);
  }
}
