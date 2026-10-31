import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface NotaEnfermeriaConsultaDialogData {}

export interface NotaEnfermeriaConsultaDialogResultado {
  nota: string;
}

// Popup para dejar una nota de enfermería en ESTA consulta externa —
// replica la hoja "ENFERMERIA" del Sanatorio Medicentro. Fecha/hora y
// quién la escribe se resuelven solos (hora actual y médico de la cita,
// ver consulta-atencion.ts).
@Component({
  selector: 'app-nota-enfermeria-consulta-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './nota-enfermeria-consulta-dialog.html',
  styleUrl: './dialogs.css',
})
export class NotaEnfermeriaConsultaDialog {
  data = inject<NotaEnfermeriaConsultaDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<NotaEnfermeriaConsultaDialog>);
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    nota: ['', Validators.required],
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
    const resultado: NotaEnfermeriaConsultaDialogResultado = {
      nota: v.nota.trim(),
    };
    this.dialogRef.close(resultado);
  }
}
