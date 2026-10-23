import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConstanciaDialogData {
  valorInicial: { diagnostico: string | null; contenido: string } | null;
}

export interface ConstanciaDialogResultado {
  diagnostico: string | null;
  contenido: string;
}

// Popup para crear/editar la constancia médica de la consulta.
@Component({
  selector: 'app-constancia-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './constancia-dialog.html',
  styleUrl: './dialogs.css',
})
export class ConstanciaDialog {
  data = inject<ConstanciaDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ConstanciaDialog>);
  private fb = inject(FormBuilder);

  esNuevo = !this.data.valorInicial;

  form = this.fb.nonNullable.group({
    diagnostico: [this.data.valorInicial?.diagnostico ?? ''],
    contenido: [this.data.valorInicial?.contenido ?? '', Validators.required],
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
    const resultado: ConstanciaDialogResultado = {
      diagnostico: v.diagnostico.trim() || null,
      contenido: v.contenido.trim(),
    };
    this.dialogRef.close(resultado);
  }
}
