import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ActaDialogData {
  esNueva: boolean;
  // Motivo de la consulta, de solo lectura: ya no se vuelve a pedir aquí
  // (se lleva tal cual de la cita, mismo criterio que datos-consulta-dialog).
  motivoConsulta: string | null;
  observacionesIniciales: string | null;
}

export interface ActaDialogResultado {
  observaciones: string | null;
}

// Popup de cierre de la consulta (ver SOLICITUD_MOTOR_CONSULTAS.md): el
// libro de actas ya no se llena suelto al ingreso del paciente, sino aquí,
// al terminar la atención.
@Component({
  selector: 'app-acta-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './acta-dialog.html',
  styleUrl: './dialogs.css',
})
export class ActaDialog {
  data = inject<ActaDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ActaDialog>);
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    observaciones: [this.data.observacionesIniciales ?? '', Validators.maxLength(1000)],
  });

  cancelar(): void {
    this.dialogRef.close(null);
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    const resultado: ActaDialogResultado = {
      observaciones: this.form.getRawValue().observaciones.trim() || null,
    };
    this.dialogRef.close(resultado);
  }
}
