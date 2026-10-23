import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ExamenDialogData {
  tiposExamen: { idTipoExamen: number; nombre: string }[];
  prioridades: { id: number; label: string }[];
  // Órdenes de esta cita a las que se les puede agregar otro examen, en vez
  // de crear una orden nueva (mismo criterio que el recetario).
  ordenesVigentes: { idOrden: number; resumen: string }[];
}

export interface ExamenDialogResultado {
  // null = crear una orden nueva con este examen. Si trae un id, se agrega
  // como un examen más a esa orden existente.
  idOrdenDestino: number | null;
  idTipoExamen: number;
  idPrioridad: number | null;
}

// Popup para solicitar un examen de laboratorio en la consulta.
@Component({
  selector: 'app-examen-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatSelectModule, MatButtonModule, MatIconModule],
  templateUrl: './examen-dialog.html',
  styleUrl: './dialogs.css',
})
export class ExamenDialog {
  data = inject<ExamenDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ExamenDialog>);
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    idOrdenDestino: this.fb.control<number | null>(this.data.ordenesVigentes[0]?.idOrden ?? null),
    idTipoExamen: this.fb.control<number | null>(null, Validators.required),
    idPrioridad: this.fb.control<number | null>(null),
  });

  cancelar(): void {
    this.dialogRef.close(null);
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const resultado: ExamenDialogResultado = {
      idOrdenDestino: v.idOrdenDestino,
      idTipoExamen: v.idTipoExamen!,
      idPrioridad: v.idPrioridad,
    };
    this.dialogRef.close(resultado);
  }
}
