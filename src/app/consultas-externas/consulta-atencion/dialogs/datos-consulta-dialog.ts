import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface DatosConsultaDialogData {
  // Se resuelve solo (FICHA_EXTERNA u otro por defecto) — el médico no
  // tiene que elegirlo; lo único que se le pide es el diagnóstico.
  idTipoRegistroDefault: number | null;
  valorInicial: {
    idTipoRegistro: number;
    idNivelConfidencialidad: number | null;
    diagnostico: string | null;
    notas: string | null;
  } | null;
}

export interface DatosConsultaDialogResultado {
  idTipoRegistro: number;
  idNivelConfidencialidad: number | null;
  diagnostico: string | null;
  notas: string | null;
}

// Popup para capturar/editar los datos clínicos de la consulta. Lo único
// que se le exige al médico es el diagnóstico — el motivo de consulta ya
// no se edita aquí: viene de recepción/emergencia y se muestra en el
// resumen rápido debajo del encabezado de la pantalla.
@Component({
  selector: 'app-datos-consulta-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './datos-consulta-dialog.html',
  styleUrl: './dialogs.css',
})
export class DatosConsultaDialog {
  data = inject<DatosConsultaDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<DatosConsultaDialog>);
  private fb = inject(FormBuilder);

  esNuevo = !this.data.valorInicial;

  // No visible en el formulario: se guarda igual, con el valor que ya tenía
  // el registro o el que se resolvió por defecto.
  private idTipoRegistro = this.data.valorInicial?.idTipoRegistro ?? this.data.idTipoRegistroDefault;
  private idNivelConfidencialidad = this.data.valorInicial?.idNivelConfidencialidad ?? null;

  form = this.fb.nonNullable.group({
    diagnostico: [this.data.valorInicial?.diagnostico ?? '', Validators.required],
    notas: [this.data.valorInicial?.notas ?? ''],
  });

  cancelar(): void {
    this.dialogRef.close(null);
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.idTipoRegistro === null) {
      return;
    }
    const v = this.form.getRawValue();
    const resultado: DatosConsultaDialogResultado = {
      idTipoRegistro: this.idTipoRegistro,
      idNivelConfidencialidad: this.idNivelConfidencialidad,
      diagnostico: v.diagnostico.trim(),
      notas: v.notas.trim() || null,
    };
    this.dialogRef.close(resultado);
  }
}
