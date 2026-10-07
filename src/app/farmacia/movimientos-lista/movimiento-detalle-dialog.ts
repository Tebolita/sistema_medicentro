import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { MovimientoInventario } from '../../models';

export interface MovimientoDetalleData {
  movimiento: MovimientoInventario;
  nombreItem: string;
  tipoLabel: string;
  esEntrada: boolean;
  stockActual: number | null;
}

// Popup con el detalle de un movimiento de inventario, para no tener que
// adivinarlo a partir de la fila resumida de la lista.
@Component({
  selector: 'app-movimiento-detalle-dialog',
  imports: [MatDialogModule, MatIconModule, MatButtonModule, RouterLink],
  templateUrl: './movimiento-detalle-dialog.html',
  styleUrl: './movimiento-detalle-dialog.css',
})
export class MovimientoDetalleDialog {
  data = inject<MovimientoDetalleData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<MovimientoDetalleDialog>);

  cerrar(): void {
    this.dialogRef.close();
  }

  formatFecha(iso: string): string {
    return new Date(iso).toLocaleString('es-GT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
