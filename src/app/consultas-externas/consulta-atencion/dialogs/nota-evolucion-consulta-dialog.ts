import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface NotaEvolucionConsultaDialogData {}

export interface NotaEvolucionConsultaDialogResultado {
  evolucion: string;
}

// Popup para dejar una nota de evolución en ESTA consulta externa — replica
// el papel "HOJA DE EVOLUCIÓN" del Sanatorio Medicentro. Fecha/hora y
// médico se resuelven solos (hora actual y médico de la cita, ver
// consulta-atencion.ts).
@Component({
  selector: 'app-nota-evolucion-consulta-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './nota-evolucion-consulta-dialog.html',
  styleUrl: './dialogs.css',
})
export class NotaEvolucionConsultaDialog {
  data = inject<NotaEvolucionConsultaDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<NotaEvolucionConsultaDialog>);
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    evolucion: ['', Validators.required],
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
    const resultado: NotaEvolucionConsultaDialogResultado = {
      evolucion: v.evolucion.trim(),
    };
    this.dialogRef.close(resultado);
  }
}
