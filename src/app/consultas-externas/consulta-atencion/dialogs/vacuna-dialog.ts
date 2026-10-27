import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface VacunaDialogData {
  tiposVacuna: { id: number; label: string }[];
}

export interface VacunaDialogResultado {
  idTipoVacuna: number;
  dosis: string | null;
  observaciones: string | null;
}

// Popup para registrar una vacuna aplicada en ESTA consulta (no es
// historial reutilizable del paciente como alergias/antecedentes: cada
// consulta tiene su propio registro de qué se inyectó).
@Component({
  selector: 'app-vacuna-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule],
  templateUrl: './vacuna-dialog.html',
  styleUrl: './dialogs.css',
})
export class VacunaDialog {
  data = inject<VacunaDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<VacunaDialog>);
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    idTipoVacuna: this.fb.control<number | null>(null, Validators.required),
    dosis: [''],
    observaciones: [''],
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
    const resultado: VacunaDialogResultado = {
      idTipoVacuna: v.idTipoVacuna!,
      dosis: v.dosis.trim() || null,
      observaciones: v.observaciones.trim() || null,
    };
    this.dialogRef.close(resultado);
  }
}
