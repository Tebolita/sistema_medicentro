import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ControlSignosConsultaDialogData {}

export interface ControlSignosConsultaDialogResultado {
  presionArterial: string | null;
  temperatura: number | null;
  frecuenciaRespiratoria: number | null;
  observaciones: string | null;
}

// Popup para dejar un control de signos en ESTA consulta externa — replica
// el papel "CONTROL DE SIGNOS" del Sanatorio Medicentro. Fecha/hora se
// resuelve sola (hora actual, ver consulta-atencion.ts).
@Component({
  selector: 'app-control-signos-consulta-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './control-signos-consulta-dialog.html',
  styleUrl: './dialogs.css',
})
export class ControlSignosConsultaDialog {
  data = inject<ControlSignosConsultaDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ControlSignosConsultaDialog>);
  private fb = inject(FormBuilder);

  form = this.fb.nonNullable.group({
    presionArterial: [''],
    temperatura: this.fb.control<number | null>(null),
    frecuenciaRespiratoria: this.fb.control<number | null>(null),
    observaciones: [''],
  });

  cancelar(): void {
    this.dialogRef.close(null);
  }

  guardar(): void {
    const v = this.form.getRawValue();
    const resultado: ControlSignosConsultaDialogResultado = {
      presionArterial: v.presionArterial.trim() || null,
      temperatura: v.temperatura,
      frecuenciaRespiratoria: v.frecuenciaRespiratoria,
      observaciones: v.observaciones.trim() || null,
    };
    this.dialogRef.close(resultado);
  }
}
