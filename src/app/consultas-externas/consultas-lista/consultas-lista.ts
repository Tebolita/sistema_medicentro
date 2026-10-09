import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';

import { CitaService } from '../../service/cita.service';
import { PacienteService } from '../../service/paciente.service';
import { EmpleadoService } from '../../service/empleado.service';
import { CatalogoService } from '../../service/catalogo.service';
import { Cita } from '../../models/cita.model';
import { PacienteListado } from '../../models/paciente.model';
import { Medico } from '../../models/medico.model';
import { CatalogoOpcion, CODIGOS_CATALOGO } from '../../models/catalogo.model';

// La tabla `citas` no tiene columna de tipo de consulta (Primera vez /
// Reconsulta): el formulario lo guarda al inicio de `notas` con este prefijo.
const PREFIJO_TIPO = /^Tipo de consulta: ([^.]+)\.\s*/;

// Fila que muestra la lista (misma forma que usaba la pantalla antes).
interface ConsultaFila {
  idCita: number;
  idPaciente: number;
  idMedico: number;
  fechaHoraInicio: string;
  idEstadoCita: number;
  idTipoConsulta: number | null; // id del catálogo TIPO_CONSULTA
  motivoConsulta: string | null;
}

@Component({
  selector: 'app-consultas-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './consultas-lista.html',
  styleUrl: './consultas-lista.css',
})
export class ConsultasLista {
  private citaService = inject(CitaService);
  private pacienteService = inject(PacienteService);
  private empleadoService = inject(EmpleadoService);
  private catalogoService = inject(CatalogoService);
  private platformId = inject(PLATFORM_ID);

  buscar = signal('');

  // Datos reales desde la API (ya no hay datos de ejemplo).
  private lista = signal<ConsultaFila[]>([]);
  private pacientesApi = signal<PacienteListado[]>([]);
  private medicos = signal<Medico[]>([]);
  private estados = signal<CatalogoOpcion[]>([]);
  private tiposConsulta = signal<CatalogoOpcion[]>([]);

  constructor() {
    // En el servidor (SSR) no hay sesión ni token: solo se consulta desde el navegador.
    if (isPlatformBrowser(this.platformId)) {
      this.cargar();
    }
  }

  private cargar(): void {
    forkJoin({
      citas: this.citaService.RetornarCitas(),
      pacientes: this.pacienteService.RetornarPacientes(),
      medicos: this.empleadoService.RetornarMedicos(),
      estados: this.catalogoService.RetornarCatalogo(CODIGOS_CATALOGO.ESTADO_CITA),
      tiposConsulta: this.catalogoService.RetornarCatalogo(CODIGOS_CATALOGO.TIPO_CONSULTA),
    }).subscribe({
      next: (r) => {
        this.tiposConsulta.set(r.tiposConsulta.datos ?? []);
        this.lista.set((r.citas.datos ?? []).map((c) => this.aFila(c.cita)));
        this.pacientesApi.set(r.pacientes.datos ?? []);
        this.medicos.set(r.medicos.datos ?? []);
        this.estados.set(r.estados.datos ?? []);
      },
      error: (err: Error) => alert('No se pudieron cargar las consultas: ' + err.message),
    });
  }

  private aFila(c: Cita): ConsultaFila {
    return {
      idCita: c.idCita,
      idPaciente: c.idPaciente,
      idMedico: c.idMedico,
      fechaHoraInicio: c.fechaHoraInicio,
      idEstadoCita: c.idEstadoCita,
      idTipoConsulta: this.idTipoConsultaDesdeNotas(c.notas),
      motivoConsulta: c.motivoConsulta,
    };
  }

  // Traduce el texto guardado en `notas` ("Tipo de consulta: Reconsulta.") al id del catálogo.
  private idTipoConsultaDesdeNotas(notas: string | null): number | null {
    const nombre = notas?.match(PREFIJO_TIPO)?.[1]?.trim();
    if (!nombre) return null;
    return this.tiposConsulta().find((t) => t.nombre === nombre)?.id ?? null;
  }

  consultas = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.lista();
    if (!term) {
      return lista;
    }
    return lista.filter((c) =>
      [this.nombrePaciente(c.idPaciente), this.medicoLabel(c.idMedico), c.motivoConsulta]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

  nombrePaciente(idPaciente: number): string {
    const p = this.pacientesApi().find((pac) => pac.idPaciente === idPaciente);
    if (!p) {
      return 'Paciente no encontrado';
    }
    return [p.primerNombre, p.segundoNombre, p.primerApellido, p.segundoApellido].filter(Boolean).join(' ');
  }

  iniciales(idPaciente: number): string {
    const partes = this.nombrePaciente(idPaciente).split(' ').filter(Boolean);
    return `${partes[0]?.charAt(0) ?? ''}${partes[1]?.charAt(0) ?? ''}`.toUpperCase();
  }

  medicoLabel(idMedico: number | null): string {
    return this.medicos().find((m) => m.idEmpleado === idMedico)?.nombreCompleto ?? '—';
  }

  tipoConsultaLabel(idTipoConsulta: number | null): string {
    return this.tiposConsulta().find((t) => t.id === idTipoConsulta)?.nombre ?? '—';
  }

  estadoLabel(idEstadoCita: number): string {
    return this.estados().find((e) => e.id === idEstadoCita)?.nombre ?? '—';
  }

  // Se compara por código: los ids reales dependen de cada base.
  estadoClase(idEstadoCita: number): string {
    const codigo = this.estados().find((e) => e.id === idEstadoCita)?.codigo;
    if (codigo === 'ATENDIDA') return 'estado-atendida';
    if (codigo === 'CANCELADA') return 'estado-cancelada';
    if (codigo === 'EN_ATENCION') return 'estado-en-atencion';
    return 'estado-programada';
  }

  formatFechaHora(iso: string): string {
    const fecha = new Date(iso);
    return fecha.toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  eliminar(id: number, paciente: string): void {
    if (!confirm(`¿Eliminar la consulta de "${paciente}"?`)) {
      return;
    }
    this.citaService.EliminarCita(id).subscribe({
      next: () => this.lista.update((l) => l.filter((c) => c.idCita !== id)),
      error: (err: Error) => alert('No se pudo eliminar la consulta: ' + err.message),
    });
  }
}