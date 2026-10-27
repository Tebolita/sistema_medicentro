import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FichaConsultaExternaAdulto } from '../../../models/ficha-consulta-externa-adulto.model';

export interface FichaConsultaExternaAdultoDialogData {
  valorInicial: FichaConsultaExternaAdulto | null;
}

export interface FichaConsultaExternaAdultoDialogResultado {
  peso: number | null;
  talla: number | null;
  presionArterial: string | null;
  frecuenciaCardiaca: number | null;
  frecuenciaRespiratoria: number | null;
  temperatura: number | null;
  motivoHistoriaActual: string;
  examenFisico: string | null;
  planDiagnostico: string | null;
  planTerapeutico: string | null;
  estudiosComplementarios: string | null;
}

// Popup para capturar la ficha clínica "Consulta Externa Adulto" del
// Sanatorio Medicentro (digitalización del formulario de papel). Los datos
// generales del paciente (carnet, DPI, nombre, edad) no se piden aquí: ya
// están resueltos desde la cita/paciente (ver consulta-atencion.ts).
@Component({
  selector: 'app-ficha-consulta-externa-adulto-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './ficha-consulta-externa-adulto-dialog.html',
  styleUrl: './dialogs.css',
})
export class FichaConsultaExternaAdultoDialog {
  data = inject<FichaConsultaExternaAdultoDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<FichaConsultaExternaAdultoDialog>);
  private fb = inject(FormBuilder);

  esNueva = !this.data.valorInicial;

  form = this.fb.nonNullable.group({
    peso: this.fb.control<number | null>(this.data.valorInicial?.peso ?? null, Validators.min(0)),
    talla: this.fb.control<number | null>(this.data.valorInicial?.talla ?? null, Validators.min(0)),
    presionArterial: [this.data.valorInicial?.presionArterial ?? ''],
    frecuenciaCardiaca: this.fb.control<number | null>(this.data.valorInicial?.frecuenciaCardiaca ?? null, Validators.min(0)),
    frecuenciaRespiratoria: this.fb.control<number | null>(this.data.valorInicial?.frecuenciaRespiratoria ?? null, Validators.min(0)),
    temperatura: this.fb.control<number | null>(this.data.valorInicial?.temperatura ?? null, Validators.min(0)),
    motivoHistoriaActual: [this.data.valorInicial?.motivoHistoriaActual ?? '', Validators.required],
    examenFisico: [this.data.valorInicial?.examenFisico ?? ''],
    planDiagnostico: [this.data.valorInicial?.planDiagnostico ?? ''],
    planTerapeutico: [this.data.valorInicial?.planTerapeutico ?? ''],
    estudiosComplementarios: [this.data.valorInicial?.estudiosComplementarios ?? ''],
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
    const resultado: FichaConsultaExternaAdultoDialogResultado = {
      peso: v.peso,
      talla: v.talla,
      presionArterial: texto(v.presionArterial),
      frecuenciaCardiaca: v.frecuenciaCardiaca,
      frecuenciaRespiratoria: v.frecuenciaRespiratoria,
      temperatura: v.temperatura,
      motivoHistoriaActual: v.motivoHistoriaActual.trim(),
      examenFisico: texto(v.examenFisico),
      planDiagnostico: texto(v.planDiagnostico),
      planTerapeutico: texto(v.planTerapeutico),
      estudiosComplementarios: texto(v.estudiosComplementarios),
    };
    this.dialogRef.close(resultado);
  }
}
