import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { OrdenRayosX } from '../../../models/orden-rayos-x.model';

export interface OrdenRayosXDialogData {
  valorInicial: OrdenRayosX | null;
}

export interface OrdenRayosXDialogResultado {
  estudioRequerido: string;
  datosClinicos: string | null;
  telefono: string | null;
  correoElectronico: string | null;
}

// Popup para capturar la orden de Rayos X. Nombre y edad del paciente,
// fecha y médico referente no se piden aquí: ya están resueltos desde la
// cita/paciente (ver consulta-atencion.ts).
@Component({
  selector: 'app-orden-rayos-x-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './orden-rayos-x-dialog.html',
  styleUrl: './dialogs.css',
})
export class OrdenRayosXDialog {
  data = inject<OrdenRayosXDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<OrdenRayosXDialog>);
  private fb = inject(FormBuilder);

  esNueva = !this.data.valorInicial;

  form = this.fb.nonNullable.group({
    estudioRequerido: [this.data.valorInicial?.estudioRequerido ?? '', Validators.required],
    datosClinicos: [this.data.valorInicial?.datosClinicos ?? ''],
    telefono: [this.data.valorInicial?.telefono ?? '', Validators.maxLength(50)],
    correoElectronico: [this.data.valorInicial?.correoElectronico ?? '', [Validators.email, Validators.maxLength(150)]],
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
    const texto = (s: string) => s.trim() || null;
    const resultado: OrdenRayosXDialogResultado = {
      estudioRequerido: v.estudioRequerido.trim(),
      datosClinicos: texto(v.datosClinicos),
      telefono: texto(v.telefono),
      correoElectronico: texto(v.correoElectronico),
    };
    this.dialogRef.close(resultado);
  }
}
