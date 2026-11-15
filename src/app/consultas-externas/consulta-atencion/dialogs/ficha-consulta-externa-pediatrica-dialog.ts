import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FichaConsultaExternaPediatrica } from '../../../models/ficha-consulta-externa-pediatrica.model';

export interface FichaConsultaExternaPediatricaDialogData {
  valorInicial: FichaConsultaExternaPediatrica | null;
}

export interface FichaConsultaExternaPediatricaDialogResultado {
  motivoConsulta: string;
  historiaClinica: string | null;
  lugarNacimiento: string | null;
  tipoParto: string | null;
  pan: string | null;
  llantoAlNacer: string | null;
  complicaciones: string | null;
  alimentacionLm: boolean | null;
  alimentacionTiempo: string | null;
  formula: string | null;
  inmunizacionesCompletas: boolean | null;
  inmunizacionesEn: string | null;
  sonrisaSocial: string | null;
  seSento: string | null;
  camino: string | null;
  hablo: string | null;
  revisionPorSistemas: string | null;
  peso: number | null;
  talla: number | null;
  cc: number | null;
  pe: number | null;
  te: number | null;
  pt: number | null;
  imc: number | null;
  fr: number | null;
  fc: number | null;
  temperatura: number | null;
  pa: string | null;
  downes: string | null;
  frEaCr: string | null;
  examenFisico: string | null;
  planDiagnostico: string | null;
  planTerapeutico: string | null;
  planEducacional: string | null;
}

// Popup para capturar la ficha clínica "Expediente Clínico Pediátrico" del
// Sanatorio Medicentro (digitalización del formulario de papel). Los datos
// generales del paciente (nombre, edad, padre/encargado) no se piden aquí:
// ya están resueltos desde la cita/paciente (ver consulta-atencion.ts).
@Component({
  selector: 'app-ficha-consulta-externa-pediatrica-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatCheckboxModule, MatButtonModule, MatIconModule],
  templateUrl: './ficha-consulta-externa-pediatrica-dialog.html',
  styleUrl: './dialogs.css',
})
export class FichaConsultaExternaPediatricaDialog {
  data = inject<FichaConsultaExternaPediatricaDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<FichaConsultaExternaPediatricaDialog>);
  private fb = inject(FormBuilder);

  esNueva = !this.data.valorInicial;

  form = this.fb.nonNullable.group({
    motivoConsulta: [this.data.valorInicial?.motivoConsulta ?? '', Validators.required],
    historiaClinica: [this.data.valorInicial?.historiaClinica ?? ''],

    lugarNacimiento: [this.data.valorInicial?.lugarNacimiento ?? ''],
    tipoParto: [this.data.valorInicial?.tipoParto ?? ''],
    pan: [this.data.valorInicial?.pan ?? ''],
    llantoAlNacer: [this.data.valorInicial?.llantoAlNacer ?? ''],
    complicaciones: [this.data.valorInicial?.complicaciones ?? ''],
    alimentacionLm: this.fb.control<boolean | null>(this.data.valorInicial?.alimentacionLm ?? null),
    alimentacionTiempo: [this.data.valorInicial?.alimentacionTiempo ?? ''],
    formula: [this.data.valorInicial?.formula ?? ''],
    inmunizacionesCompletas: this.fb.control<boolean | null>(this.data.valorInicial?.inmunizacionesCompletas ?? null),
    inmunizacionesEn: [this.data.valorInicial?.inmunizacionesEn ?? ''],

    sonrisaSocial: [this.data.valorInicial?.sonrisaSocial ?? ''],
    seSento: [this.data.valorInicial?.seSento ?? ''],
    camino: [this.data.valorInicial?.camino ?? ''],
    hablo: [this.data.valorInicial?.hablo ?? ''],

    revisionPorSistemas: [this.data.valorInicial?.revisionPorSistemas ?? ''],

    peso: this.fb.control<number | null>(this.data.valorInicial?.peso ?? null, Validators.min(0)),
    talla: this.fb.control<number | null>(this.data.valorInicial?.talla ?? null, Validators.min(0)),
    cc: this.fb.control<number | null>(this.data.valorInicial?.cc ?? null, Validators.min(0)),
    pe: this.fb.control<number | null>(this.data.valorInicial?.pe ?? null, Validators.min(0)),
    te: this.fb.control<number | null>(this.data.valorInicial?.te ?? null, Validators.min(0)),
    pt: this.fb.control<number | null>(this.data.valorInicial?.pt ?? null, Validators.min(0)),
    imc: this.fb.control<number | null>(this.data.valorInicial?.imc ?? null, Validators.min(0)),
    fr: this.fb.control<number | null>(this.data.valorInicial?.fr ?? null, Validators.min(0)),
    fc: this.fb.control<number | null>(this.data.valorInicial?.fc ?? null, Validators.min(0)),
    temperatura: this.fb.control<number | null>(this.data.valorInicial?.temperatura ?? null, Validators.min(0)),
    pa: [this.data.valorInicial?.pa ?? ''],
    downes: [this.data.valorInicial?.downes ?? ''],
    frEaCr: [this.data.valorInicial?.frEaCr ?? ''],
    examenFisico: [this.data.valorInicial?.examenFisico ?? ''],

    planDiagnostico: [this.data.valorInicial?.planDiagnostico ?? ''],
    planTerapeutico: [this.data.valorInicial?.planTerapeutico ?? ''],
    planEducacional: [this.data.valorInicial?.planEducacional ?? ''],
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
    const resultado: FichaConsultaExternaPediatricaDialogResultado = {
      motivoConsulta: v.motivoConsulta.trim(),
      historiaClinica: texto(v.historiaClinica),
      lugarNacimiento: texto(v.lugarNacimiento),
      tipoParto: texto(v.tipoParto),
      pan: texto(v.pan),
      llantoAlNacer: texto(v.llantoAlNacer),
      complicaciones: texto(v.complicaciones),
      alimentacionLm: v.alimentacionLm,
      alimentacionTiempo: texto(v.alimentacionTiempo),
      formula: texto(v.formula),
      inmunizacionesCompletas: v.inmunizacionesCompletas,
      inmunizacionesEn: texto(v.inmunizacionesEn),
      sonrisaSocial: texto(v.sonrisaSocial),
      seSento: texto(v.seSento),
      camino: texto(v.camino),
      hablo: texto(v.hablo),
      revisionPorSistemas: texto(v.revisionPorSistemas),
      peso: v.peso,
      talla: v.talla,
      cc: v.cc,
      pe: v.pe,
      te: v.te,
      pt: v.pt,
      imc: v.imc,
      fr: v.fr,
      fc: v.fc,
      temperatura: v.temperatura,
      pa: texto(v.pa),
      downes: texto(v.downes),
      frEaCr: texto(v.frEaCr),
      examenFisico: texto(v.examenFisico),
      planDiagnostico: texto(v.planDiagnostico),
      planTerapeutico: texto(v.planTerapeutico),
      planEducacional: texto(v.planEducacional),
    };
    this.dialogRef.close(resultado);
  }
}
