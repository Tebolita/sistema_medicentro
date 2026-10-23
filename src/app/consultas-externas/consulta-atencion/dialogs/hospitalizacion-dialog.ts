import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CamaOpcion } from '../../../service/hospitalizaciones.service';

export interface HospitalizacionDialogData {
  camasLibres: CamaOpcion[];
  // Precargado con el diagnóstico/motivo que ya se tiene de la consulta —
  // el médico lo puede ajustar, no empieza en blanco.
  motivoIngresoPorDefecto: string | null;
}

export interface HospitalizacionDialogResultado {
  idCama: number;
  motivoIngreso: string;
}

// Popup para iniciar una hospitalización desde la misma pantalla de
// atención, ya con paciente y médico responsable resueltos (son los de la
// consulta) — no hace falta ir al módulo de Hospitalización a buscarlos.
@Component({
  selector: 'app-hospitalizacion-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule],
  templateUrl: './hospitalizacion-dialog.html',
  styleUrl: './dialogs.css',
})
export class HospitalizacionDialog {
  data = inject<HospitalizacionDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<HospitalizacionDialog>);
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    idCama: this.fb.control<number | null>(null, Validators.required),
    motivoIngreso: [this.data.motivoIngresoPorDefecto ?? '', Validators.required],
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
    const resultado: HospitalizacionDialogResultado = {
      idCama: v.idCama!,
      motivoIngreso: v.motivoIngreso.trim(),
    };
    this.dialogRef.close(resultado);
  }
}
