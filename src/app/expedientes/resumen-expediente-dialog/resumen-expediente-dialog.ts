import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';

import { Cita } from '../../models/cita.model';
import { Paciente, PacienteAlergia, PacienteAntecedente } from '../../models/paciente.model';
import { PacienteService } from '../../service/paciente.service';
import { EmpleadoService } from '../../service/empleado.service';
import { CatalogosService } from '../../service/catalogos.service';
import { MedicamentosService } from '../../service/medicamentos.service';
import { HospitalizacionesService } from '../../service/hospitalizaciones.service';

import { FichaConsultaExternaAdultoService } from '../../service/ficha-consulta-externa-adulto.service';
import { FichaConsultaExternaAdulto } from '../../models/ficha-consulta-externa-adulto.model';
import { FichaConsultaExternaPediatricaService } from '../../service/ficha-consulta-externa-pediatrica.service';
import { FichaConsultaExternaPediatrica } from '../../models/ficha-consulta-externa-pediatrica.model';
import { FichaClinicaGeneralService } from '../../service/ficha-clinica-general.service';
import { FichaClinicaGeneral } from '../../models/ficha-clinica-general.model';
import { OrdenMedicaConsultaService } from '../../service/orden-medica-consulta.service';
import { OrdenMedicaConsulta } from '../../models/orden-medica-consulta.model';
import { NotaEvolucionConsultaService } from '../../service/nota-evolucion-consulta.service';
import { NotaEvolucionConsulta } from '../../models/nota-evolucion-consulta.model';
import { NotaEnfermeriaConsultaService } from '../../service/nota-enfermeria-consulta.service';
import { NotaEnfermeriaConsulta } from '../../models/nota-enfermeria-consulta.model';
import { ControlSignosConsultaService } from '../../service/control-signos-consulta.service';
import { ControlSignosConsulta } from '../../models/control-signos-consulta.model';
import { CostoPacienteConsultaService } from '../../service/costo-paciente-consulta.service';
import { CostoPacienteConsulta } from '../../models/costo-paciente-consulta.model';
import { LaboratorioService, OrdenCompleta } from '../../service/laboratorio.service';

import {
  edadPaciente,
  textoAntecedentes,
  textoAlergiasPaciente,
  textoVacunasAplicadas,
  construirHtmlFichaConsultaExternaAdulto,
  construirHtmlFichaConsultaExternaPediatrica,
  construirHtmlFichaClinicaGeneral,
  construirHtmlOrdenesMedicasConsulta,
  construirHtmlEvolucionConsulta,
  construirHtmlEnfermeriaConsulta,
  construirHtmlControlSignosConsulta,
  construirHtmlCostoPacienteConsulta,
  construirHtmlVacunasAplicadas,
  construirHtmlOrdenesLaboratorio,
} from '../../consultas-externas/consulta-atencion/consulta-impresiones';
import {
  construirHtmlControlMedicamentos,
  construirHtmlIngresoHospitalario,
  abrirVentanaImpresion,
} from '../../hospitalizacion/hospitalizacion-impresiones';
import { VacunaAplicadaService } from '../../service/vacuna-aplicada.service';
import { VacunaAplicada } from '../../models/vacuna-aplicada.model';

export interface ResumenExpedienteDialogData {
  citas: Cita[];
  nombrePaciente: string;
  idPaciente: number;
}

export type TipoDocumentoResumen =
  | 'fichaCea'
  | 'fichaCep'
  | 'fichaCg'
  | 'ordenes'
  | 'evolucion'
  | 'enfermeria'
  | 'signos'
  | 'costo'
  | 'controlMedicamentos'
  | 'vacunas'
  | 'laboratorio'
  | 'hospitalizacion';

interface ChecklistCita {
  fichaCea: boolean;
  fichaCep: boolean;
  fichaCg: boolean;
  ordenes: boolean;
  evolucion: boolean;
  enfermeria: boolean;
  signos: boolean;
  costo: boolean;
  controlMedicamentos: boolean;
  vacunas: boolean;
  laboratorio: boolean;
  hospitalizacion: boolean;
}

interface DatosCita {
  fichaCea: FichaConsultaExternaAdulto | null;
  fichaCep: FichaConsultaExternaPediatrica | null;
  fichaCg: FichaClinicaGeneral | null;
  ordenes: OrdenMedicaConsulta[];
  evolucion: NotaEvolucionConsulta[];
  enfermeria: NotaEnfermeriaConsulta[];
  signos: ControlSignosConsulta[];
  costo: CostoPacienteConsulta[];
  vacunas: VacunaAplicada[];
  laboratorio: OrdenCompleta[];
}

// "Resumen del expediente": el médico selecciona una o varias consultas y un
// tipo de hoja, y ve de un vistazo cuáles de las 8 ya tienen generadas, con
// vista previa embebida (mismo HTML que se manda a imprimir). Los 5 tipos
// que son bitácora (no las 2 fichas ni la hoja de control de medicamentos)
// se pueden combinar: varias consultas en una sola hoja, ordenadas por fecha.
@Component({
  selector: 'app-resumen-expediente-dialog',
  imports: [DatePipe, MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './resumen-expediente-dialog.html',
  styleUrl: './resumen-expediente-dialog.css',
})
export class ResumenExpedienteDialog {
  data = inject<ResumenExpedienteDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<ResumenExpedienteDialog>);
  private sanitizer = inject(DomSanitizer);

  private pacienteService = inject(PacienteService);
  private empleadoService = inject(EmpleadoService);
  private catalogosService = inject(CatalogosService);
  private medicamentosService = inject(MedicamentosService);
  private hospitalizacionesService = inject(HospitalizacionesService);

  private fichaCeaService = inject(FichaConsultaExternaAdultoService);
  private fichaCepService = inject(FichaConsultaExternaPediatricaService);
  private fichaCgService = inject(FichaClinicaGeneralService);
  private ordenesService = inject(OrdenMedicaConsultaService);
  private evolucionService = inject(NotaEvolucionConsultaService);
  private enfermeriaService = inject(NotaEnfermeriaConsultaService);
  private signosService = inject(ControlSignosConsultaService);
  private costoService = inject(CostoPacienteConsultaService);
  private vacunaService = inject(VacunaAplicadaService);
  private laboratorioService = inject(LaboratorioService);

  citas = [...this.data.citas].sort((a, b) => b.fechaHoraInicio.localeCompare(a.fechaHoraInicio));

  cargando = signal(true);
  citasSeleccionadas = signal<Set<number>>(new Set());
  tipoDocumento = signal<TipoDocumentoResumen>('evolucion');

  private checklistPorCita = signal<Record<number, ChecklistCita>>({});
  private datosPorCita = signal<Record<number, DatosCita>>({});

  private medicos = signal<{ idEmpleado: number; nombreCompleto: string }[]>([]);
  private tiposOrdenApi = this.catalogosService.obtener('TIPO_ORDEN_HOSPITALIZACION');
  private estadosCivilApi = this.catalogosService.obtener('ESTADO_CIVIL');
  private tiposAntecedenteApi = this.catalogosService.obtener('TIPO_ANTECEDENTE');
  private tiposAlergiaApi = this.catalogosService.obtener('TIPO_ALERGIA');
  private severidadApi = this.catalogosService.obtener('SEVERIDAD');
  private tiposVacunaApi = this.catalogosService.obtener('TIPO_VACUNA');
  medicamentos = this.medicamentosService.listar;

  // Para la hoja "Ingreso hospitalario" (cama/estado) y "Laboratorio"
  // (nombre de examen/estado de orden) — se piden una sola vez, igual que
  // médicos/paciente más abajo.
  private camasHosp = signal<{ id: number; label: string }[]>([]);
  private estadosHospApi = signal<{ id: number; label: string }[]>([]);
  private tiposExamenLab = signal<{ idTipoExamen: number; nombre: string }[]>([]);
  private estadosOrdenLab = signal<{ id: number; label: string }[]>([]);

  private antecedentesPaciente = signal<PacienteAntecedente[]>([]);
  private alergiasPaciente = signal<PacienteAlergia[]>([]);
  private pacienteCompleto = signal<Paciente | null>(null);

  // Mismos colores que cada sección ya usa en consulta-atencion.css
  // (--panel-color), para reconocer de un vistazo qué hoja es cuál.
  readonly tiposDocumento: { id: TipoDocumentoResumen; label: string; icono: string; mergeable: boolean; color: string }[] = [
    { id: 'fichaCea', label: 'Ficha clínica — Consulta externa adulto', icono: 'description', mergeable: false, color: '#1565c0' },
    { id: 'fichaCep', label: 'Ficha clínica — Consulta externa pediátrica', icono: 'child_care', mergeable: false, color: '#ef6c00' },
    { id: 'fichaCg', label: 'Ficha clínica general', icono: 'description', mergeable: false, color: '#c2185b' },
    { id: 'ordenes', label: 'Órdenes médicas', icono: 'assignment_turned_in', mergeable: true, color: '#2e7d32' },
    { id: 'evolucion', label: 'Hoja de evolución', icono: 'history_edu', mergeable: true, color: '#8e24aa' },
    { id: 'enfermeria', label: 'Enfermería', icono: 'local_hospital', mergeable: true, color: '#ad1457' },
    { id: 'signos', label: 'Control de signos', icono: 'monitor_heart', mergeable: true, color: '#00695c' },
    { id: 'costo', label: 'Costo paciente', icono: 'payments', mergeable: true, color: '#f9a825' },
    { id: 'controlMedicamentos', label: 'Hoja de control de medicamentos', icono: 'medication', mergeable: false, color: '#455a64' },
    { id: 'vacunas', label: 'Vacunas aplicadas', icono: 'vaccines', mergeable: true, color: '#00838f' },
    { id: 'laboratorio', label: 'Órdenes de laboratorio', icono: 'biotech', mergeable: true, color: '#4527a0' },
    { id: 'hospitalizacion', label: 'Ingreso hospitalario', icono: 'bed', mergeable: false, color: '#5d4037' },
  ];

  constructor() {
    this.medicamentosService.cargar();

    forkJoin({
      medicos: this.empleadoService.RetornarMedicos(),
      paciente: this.pacienteService.RetornarPaciente(this.data.idPaciente),
      camas: this.hospitalizacionesService.RetornarCamas(),
      estadosHosp: this.hospitalizacionesService.RetornarEstadosHospitalizacion(),
      tiposExamen: this.laboratorioService.RetornarTiposExamen(),
      estadosOrden: this.laboratorioService.RetornarEstadosOrden(),
    }).subscribe({
      next: ({ medicos, paciente, camas, estadosHosp, tiposExamen, estadosOrden }) => {
        this.medicos.set(medicos.datos ?? []);
        this.pacienteCompleto.set(paciente.datos?.paciente ?? null);
        this.antecedentesPaciente.set((paciente.datos?.antecedentes ?? []).filter((a) => a.activo));
        this.alergiasPaciente.set((paciente.datos?.alergias ?? []).filter((a) => a.activo));
        this.camasHosp.set(camas);
        this.estadosHospApi.set(estadosHosp);
        this.tiposExamenLab.set(tiposExamen);
        this.estadosOrdenLab.set(estadosOrden);
        this.cargarChecklist();
      },
      error: () => this.cargarChecklist(),
    });
  }

  private cargarChecklist(): void {
    if (this.citas.length === 0) {
      this.cargando.set(false);
      return;
    }

    const porCita = this.citas.map((c) =>
      forkJoin({
        fichaCea: this.fichaCeaService.RetornarPorCita(c.idCita),
        fichaCep: this.fichaCepService.RetornarPorCita(c.idCita),
        fichaCg: this.fichaCgService.RetornarPorCita(c.idCita),
        ordenes: this.ordenesService.RetornarPorCita(c.idCita),
        evolucion: this.evolucionService.RetornarPorCita(c.idCita),
        enfermeria: this.enfermeriaService.RetornarPorCita(c.idCita),
        signos: this.signosService.RetornarPorCita(c.idCita),
        costo: this.costoService.RetornarPorCita(c.idCita),
        vacunas: this.vacunaService.RetornarPorCita(c.idCita),
      }),
    );

    forkJoin(porCita).subscribe({
      next: (resultados) => {
        const checklist: Record<number, ChecklistCita> = {};
        const datos: Record<number, DatosCita> = {};
        const hospitalizaciones = this.hospitalizacionesService.listar();
        const ordenesLaboratorio = this.laboratorioService.listar();

        this.citas.forEach((c, i) => {
          const r = resultados[i];
          const hospDeEstaCita = hospitalizaciones.find((h) => h.hospitalizacion.idCita === c.idCita);
          const laboratorioDeEstaCita = ordenesLaboratorio.filter((o) => o.orden.idCita === c.idCita);
          checklist[c.idCita] = {
            fichaCea: !!r.fichaCea,
            fichaCep: !!r.fichaCep,
            fichaCg: !!r.fichaCg,
            ordenes: r.ordenes.length > 0,
            evolucion: r.evolucion.length > 0,
            enfermeria: r.enfermeria.length > 0,
            signos: r.signos.length > 0,
            costo: r.costo.length > 0,
            controlMedicamentos: !!hospDeEstaCita && hospDeEstaCita.medicamentosProgramados.length > 0,
            vacunas: r.vacunas.length > 0,
            laboratorio: laboratorioDeEstaCita.length > 0,
            hospitalizacion: !!hospDeEstaCita,
          };
          datos[c.idCita] = { ...r, laboratorio: laboratorioDeEstaCita };
        });

        this.checklistPorCita.set(checklist);
        this.datosPorCita.set(datos);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
  }

  checklistDe(idCita: number): ChecklistCita | null {
    return this.checklistPorCita()[idCita] ?? null;
  }

  estaSeleccionada(idCita: number): boolean {
    return this.citasSeleccionadas().has(idCita);
  }

  toggleCita(idCita: number): void {
    this.citasSeleccionadas.update((set) => {
      const nuevo = new Set(set);
      if (nuevo.has(idCita)) nuevo.delete(idCita);
      else nuevo.add(idCita);
      return nuevo;
    });
  }

  tipoActual = computed(() => this.tiposDocumento.find((t) => t.id === this.tipoDocumento())!);

  // Más de una consulta marcada con un tipo NO mergeable: no hay forma de
  // adivinar cuál usar, así que se pide elegir solo una.
  advertenciaSeleccionMultiple = computed(() => {
    const t = this.tipoActual();
    if (t.mergeable) return null;
    if (this.citasSeleccionadas().size <= 1) return null;
    return `"${t.label}" es una ficha de una sola consulta — no se puede combinar. Selecciona solo una consulta para ver/imprimir esta hoja.`;
  });

  private medicoLabel = (idMedico: number | null): string => {
    if (idMedico == null) return '—';
    return this.medicos().find((m) => m.idEmpleado === idMedico)?.nombreCompleto ?? '—';
  };

  private tipoOrdenLabel = (idTipoOrden: number): string => {
    return this.tiposOrdenApi().find((t) => t.id === idTipoOrden)?.nombre ?? '—';
  };

  private medicamentoLabel = (idMedicamento: number): string => {
    return this.medicamentos().find((m) => m.idMedicamento === idMedicamento)?.nombre ?? '—';
  };

  private tipoVacunaLabel = (idTipoVacuna: number): string => {
    return this.tiposVacunaApi().find((t) => t.id === idTipoVacuna)?.nombre ?? '—';
  };

  private tipoExamenLabel = (idTipoExamen: number): string => {
    return this.tiposExamenLab().find((t) => t.idTipoExamen === idTipoExamen)?.nombre ?? '—';
  };

  private estadoOrdenLabel = (idEstadoOrden: number): string => {
    return this.estadosOrdenLab().find((e) => e.id === idEstadoOrden)?.label ?? '—';
  };

  private camaLabel = (idCama: number): string => {
    return this.camasHosp().find((c) => c.id === idCama)?.label ?? '—';
  };

  private estadoHospLabel = (idEstadoHospitalizacion: number): string => {
    return this.estadosHospApi().find((e) => e.id === idEstadoHospitalizacion)?.label ?? '—';
  };

  private citasSeleccionadasOrdenadas = computed(() =>
    this.citas.filter((c) => this.citasSeleccionadas().has(c.idCita)).sort((a, b) => a.fechaHoraInicio.localeCompare(b.fechaHoraInicio)),
  );

  // HTML del documento a previsualizar/imprimir — null si todavía no hay
  // suficiente selección (sin citas, o varias citas con un tipo no mergeable).
  htmlPreview = computed<string | null>(() => {
    if (this.cargando()) return null;
    const seleccionadas = this.citasSeleccionadasOrdenadas();
    if (seleccionadas.length === 0) return null;
    if (this.advertenciaSeleccionMultiple()) return null;

    const datos = this.datosPorCita();
    const nombrePaciente = this.data.nombrePaciente;
    const tipo = this.tipoDocumento();

    if (tipo === 'fichaCea' || tipo === 'fichaCep' || tipo === 'fichaCg' || tipo === 'controlMedicamentos' || tipo === 'hospitalizacion') {
      const cita = seleccionadas[0];
      const d = datos[cita.idCita];
      const paciente = this.pacienteCompleto();
      if (!paciente) return null;

      if (tipo === 'fichaCea') {
        if (!d?.fichaCea) return null;
        const fechaConsulta = new Date(cita.fechaHoraInicio).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
        return construirHtmlFichaConsultaExternaAdulto(
          d.fichaCea,
          paciente,
          fechaConsulta,
          this.medicoLabel(cita.idMedico),
          textoAntecedentes(this.antecedentesPaciente(), this.tiposAntecedenteApi()),
          textoAlergiasPaciente(this.alergiasPaciente(), this.tiposAlergiaApi(), this.severidadApi()),
          textoVacunasAplicadas(d.vacunas, this.tiposVacunaApi()),
        );
      }

      if (tipo === 'fichaCep') {
        if (!d?.fichaCep) return null;
        const fechaConsulta = new Date(cita.fechaHoraInicio).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
        return construirHtmlFichaConsultaExternaPediatrica(
          d.fichaCep,
          paciente,
          fechaConsulta,
          this.medicoLabel(cita.idMedico),
          textoAntecedentes(this.antecedentesPaciente(), this.tiposAntecedenteApi()),
          textoAlergiasPaciente(this.alergiasPaciente(), this.tiposAlergiaApi(), this.severidadApi()),
          textoVacunasAplicadas(d.vacunas, this.tiposVacunaApi()),
        );
      }

      if (tipo === 'fichaCg') {
        if (!d?.fichaCg) return null;
        const fechaConsulta = new Date(cita.fechaHoraInicio).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const estadoCivil = paciente.idEstadoCivil
          ? this.estadosCivilApi().find((e) => e.id === paciente.idEstadoCivil)?.nombre ?? null
          : null;
        return construirHtmlFichaClinicaGeneral(
          d.fichaCg,
          paciente,
          fechaConsulta,
          this.medicoLabel(cita.idMedico),
          estadoCivil,
          textoAntecedentes(this.antecedentesPaciente(), this.tiposAntecedenteApi()),
          textoAlergiasPaciente(this.alergiasPaciente(), this.tiposAlergiaApi(), this.severidadApi()),
        );
      }

      const hosp = this.hospitalizacionesService.listar().find((h) => h.hospitalizacion.idCita === cita.idCita);
      if (!hosp) return null;

      if (tipo === 'hospitalizacion') {
        return construirHtmlIngresoHospitalario(
          hosp,
          nombrePaciente,
          this.camaLabel(hosp.hospitalizacion.idCama),
          this.medicoLabel(hosp.hospitalizacion.idMedicoResponsable),
          this.estadoHospLabel(hosp.hospitalizacion.idEstadoHospitalizacion),
        );
      }

      // controlMedicamentos
      return construirHtmlControlMedicamentos(hosp, nombrePaciente, this.medicamentoLabel, (hora) => (hora ? hora.slice(0, 5) : '—'));
    }

    // Tipos mergeables: se agrupan las entradas de TODAS las citas marcadas.
    if (tipo === 'ordenes') {
      const ordenes = seleccionadas.flatMap((c) => datos[c.idCita]?.ordenes ?? []);
      return construirHtmlOrdenesMedicasConsulta(ordenes, nombrePaciente, this.tipoOrdenLabel, this.medicoLabel as (id: number) => string);
    }
    if (tipo === 'evolucion') {
      const notas = seleccionadas.flatMap((c) => datos[c.idCita]?.evolucion ?? []);
      const fechaLabel = seleccionadas.length === 1
        ? new Date(seleccionadas[0].fechaHoraInicio).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : null;
      return construirHtmlEvolucionConsulta(notas, nombrePaciente, this.medicoLabel as (id: number) => string, fechaLabel);
    }
    if (tipo === 'enfermeria') {
      const notas = seleccionadas.flatMap((c) => datos[c.idCita]?.enfermeria ?? []);
      const fechaLabel = seleccionadas.length === 1
        ? new Date(seleccionadas[0].fechaHoraInicio).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' })
        : null;
      return construirHtmlEnfermeriaConsulta(notas, nombrePaciente, this.medicoLabel as (id: number) => string, fechaLabel);
    }
    if (tipo === 'signos') {
      const controles = seleccionadas.flatMap((c) => datos[c.idCita]?.signos ?? []);
      const paciente = this.pacienteCompleto();
      const edad = paciente ? edadPaciente(paciente.fechaNacimiento) : null;
      return construirHtmlControlSignosConsulta(controles, nombrePaciente, edad);
    }
    if (tipo === 'costo') {
      const costos = seleccionadas.flatMap((c) => datos[c.idCita]?.costo ?? []);
      const paciente = this.pacienteCompleto();
      const edad = paciente ? edadPaciente(paciente.fechaNacimiento) : null;
      return construirHtmlCostoPacienteConsulta(costos, nombrePaciente, edad);
    }
    if (tipo === 'vacunas') {
      const vacunas = seleccionadas.flatMap((c) => datos[c.idCita]?.vacunas ?? []);
      if (vacunas.length === 0) return null;
      const paciente = this.pacienteCompleto();
      const edad = paciente ? edadPaciente(paciente.fechaNacimiento) : null;
      return construirHtmlVacunasAplicadas(vacunas, nombrePaciente, edad, this.tipoVacunaLabel);
    }
    if (tipo === 'laboratorio') {
      const ordenes = seleccionadas.flatMap((c) => datos[c.idCita]?.laboratorio ?? []);
      if (ordenes.length === 0) return null;
      const paciente = this.pacienteCompleto();
      const edad = paciente ? edadPaciente(paciente.fechaNacimiento) : null;
      return construirHtmlOrdenesLaboratorio(ordenes, nombrePaciente, edad, this.tipoExamenLabel, this.estadoOrdenLabel);
    }

    return null;
  });

  // El iframe [srcdoc] sanitiza el HTML por defecto (se come <style>/<html>/
  // <head>, dejando el documento sin estilos) — hay que marcarlo como
  // confiable explícitamente para que la vista previa se vea igual que la
  // hoja impresa real.
  htmlPreviewSeguro = computed<SafeHtml | null>(() => {
    const html = this.htmlPreview();
    return html ? this.sanitizer.bypassSecurityTrustHtml(html) : null;
  });

  imprimir(): void {
    const html = this.htmlPreview();
    if (!html) return;
    abrirVentanaImpresion(html);
  }

  cerrar(): void {
    this.dialogRef.close();
  }
}
