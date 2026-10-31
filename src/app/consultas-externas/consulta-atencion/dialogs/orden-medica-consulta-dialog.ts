import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface OrdenMedicaConsultaDialogData {
  tiposOrden: { id: number; label: string }[];
}

export interface OrdenMedicaConsultaDialogResultado {
  idTipoOrden: number;
  indicaciones: string;
}

// Popup para dejar una orden médica en ESTA consulta externa — replica el
// papel "ÓRDENES MÉDICAS" del Sanatorio Medicentro. Fecha/hora y médico se
// resuelven solos (hora actual y médico de la cita, ver consulta-atencion.ts).
@Component({
  selector: 'app-orden-medica-consulta-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule],
  templateUrl: './orden-medica-consulta-dialog.html',
  styleUrl: './dialogs.css',
})
export class OrdenMedicaConsultaDialog {
  data = inject<OrdenMedicaConsultaDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<OrdenMedicaConsultaDialog>);
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    idTipoOrden: this.fb.control<number | null>(null, Validators.required),
    indicaciones: ['', Validators.required],
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
    const resultado: OrdenMedicaConsultaDialogResultado = {
      idTipoOrden: v.idTipoOrden!,
      indicaciones: v.indicaciones.trim(),
    };
    this.dialogRef.close(resultado);
  }
}
