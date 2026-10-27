import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { provideNativeDateAdapter } from '@angular/material/core';
import { FichaClinicaGeneral } from '../../../models/ficha-clinica-general.model';

export interface FichaClinicaGeneralDialogData {
  valorInicial: FichaClinicaGeneral | null;
}

export interface FichaClinicaGeneralDialogResultado {
  motivoConsulta: string;
  historiaEnfermedad: string | null;
  prenatales: string | null;
  vacunacion: string | null;
  menarquia: string | null;
  ciclo: string | null;
  dolor: string | null;
  ultimaRegla: string | null;
  revisionSistemas: string | null;
  estadoGeneral: string | null;
  presionArterial: string | null;
  pulso: number | null;
  respiracion: number | null;
  temperatura: number | null;
  pielFaneras: string | null;
  cabezaCuello: string | null;
  cardioPulmonar: string | null;
  abdomen: string | null;
  dorsoRaquis: string | null;
  extremidades: string | null;
  neurologico: string | null;
  otros: string | null;
}

function toIsoDate(fecha: Date | null): string | null {
  if (!fecha) return null;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${fecha.getFullYear()}-${p(fecha.getMonth() + 1)}-${p(fecha.getDate())}`;
}

function parseIsoDateLocal(iso: string | null): Date | null {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Popup para capturar la ficha clínica "General" (papel rosa del Sanatorio
// Medicentro Barberena) — distinta de la ficha de Consulta Externa Adulto.
// Los datos generales del paciente (nombre, edad, dirección, estado civil,
// religión, ocupación) no se piden aquí: ya están resueltos desde la
// cita/paciente (ver consulta-atencion.ts).
@Component({
  selector: 'app-ficha-clinica-general-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatDatepickerModule, MatButtonModule, MatIconModule],
  providers: [provideNativeDateAdapter()],
  templateUrl: './ficha-clinica-general-dialog.html',
  styleUrl: './dialogs.css',
})
export class FichaClinicaGeneralDialog {
  data = inject<FichaClinicaGeneralDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<FichaClinicaGeneralDialog>);
  private fb = inject(FormBuilder);

  esNueva = !this.data.valorInicial;

  form = this.fb.nonNullable.group({
    motivoConsulta: [this.data.valorInicial?.motivoConsulta ?? '', Validators.required],
    historiaEnfermedad: [this.data.valorInicial?.historiaEnfermedad ?? ''],
    prenatales: [this.data.valorInicial?.prenatales ?? ''],
    vacunacion: [this.data.valorInicial?.vacunacion ?? ''],
    menarquia: [this.data.valorInicial?.menarquia ?? ''],
    ciclo: [this.data.valorInicial?.ciclo ?? ''],
    dolor: [this.data.valorInicial?.dolor ?? ''],
    ultimaRegla: this.fb.control<Date | null>(parseIsoDateLocal(this.data.valorInicial?.ultimaRegla ?? null)),
    revisionSistemas: [this.data.valorInicial?.revisionSistemas ?? ''],
    estadoGeneral: [this.data.valorInicial?.estadoGeneral ?? ''],
    presionArterial: [this.data.valorInicial?.presionArterial ?? ''],
    pulso: this.fb.control<number | null>(this.data.valorInicial?.pulso ?? null, Validators.min(0)),
    respiracion: this.fb.control<number | null>(this.data.valorInicial?.respiracion ?? null, Validators.min(0)),
    temperatura: this.fb.control<number | null>(this.data.valorInicial?.temperatura ?? null, Validators.min(0)),
    pielFaneras: [this.data.valorInicial?.pielFaneras ?? ''],
    cabezaCuello: [this.data.valorInicial?.cabezaCuello ?? ''],
    cardioPulmonar: [this.data.valorInicial?.cardioPulmonar ?? ''],
    abdomen: [this.data.valorInicial?.abdomen ?? ''],
    dorsoRaquis: [this.data.valorInicial?.dorsoRaquis ?? ''],
    extremidades: [this.data.valorInicial?.extremidades ?? ''],
    neurologico: [this.data.valorInicial?.neurologico ?? ''],
    otros: [this.data.valorInicial?.otros ?? ''],
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
    const resultado: FichaClinicaGeneralDialogResultado = {
      motivoConsulta: v.motivoConsulta.trim(),
      historiaEnfermedad: texto(v.historiaEnfermedad),
      prenatales: texto(v.prenatales),
      vacunacion: texto(v.vacunacion),
      menarquia: texto(v.menarquia),
      ciclo: texto(v.ciclo),
      dolor: texto(v.dolor),
      ultimaRegla: toIsoDate(v.ultimaRegla),
      revisionSistemas: texto(v.revisionSistemas),
      estadoGeneral: texto(v.estadoGeneral),
      presionArterial: texto(v.presionArterial),
      pulso: v.pulso,
      respiracion: v.respiracion,
      temperatura: v.temperatura,
      pielFaneras: texto(v.pielFaneras),
      cabezaCuello: texto(v.cabezaCuello),
      cardioPulmonar: texto(v.cardioPulmonar),
      abdomen: texto(v.abdomen),
      dorsoRaquis: texto(v.dorsoRaquis),
      extremidades: texto(v.extremidades),
      neurologico: texto(v.neurologico),
      otros: texto(v.otros),
    };
    this.dialogRef.close(resultado);
  }
}
