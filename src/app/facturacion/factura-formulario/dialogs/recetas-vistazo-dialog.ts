import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RecetaCompleta } from '../../../service/recetas.service';

export interface RecetasVistazoDialogData {
  recetas: RecetaCompleta[];
  // Nombre ya resuelto (medicamento del inventario o externo) por línea,
  // para no depender de MedicamentosService dentro del diálogo.
  nombreMedicamento: (idMedicamento: number | null, nombreMedicamentoExterno: string | null) => string;
  recetaAnulada: (idEstadoReceta: number) => boolean;
}

// Vistazo rápido, de solo lectura: qué medicamentos lleva cada receta de
// este paciente, para que quien factura (o el médico) lo vea de un
// vistazo sin tener que ir a Farmacia → Recetas.
@Component({
  selector: 'app-recetas-vistazo-dialog',
  imports: [MatDialogModule, MatButtonModule, MatIconModule, DatePipe],
  templateUrl: './recetas-vistazo-dialog.html',
  styleUrl: './recetas-vistazo-dialog.css',
})
export class RecetasVistazoDialog {
  data = inject<RecetasVistazoDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<RecetasVistazoDialog>);

  cerrar(): void {
    this.dialogRef.close();
  }
}
