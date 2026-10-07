import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  LaboratorioService,
  OrdenCompleta,
  TipoExamen,
  OpcionCatalogo,
  MedicoOpcion,
} from '../laboratorio.service';
import { PacientesService } from '../../pacientes/pacientes.service';
import { MENU_SECTIONS } from '../../shared/menu-data';

@Component({
  selector: 'app-laboratorio-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './laboratorio-lista.html',
  styleUrl: './laboratorio-lista.css',
})
export class LaboratorioLista {
  private laboratorioService = inject(LaboratorioService);
  private pacientesService = inject(PacientesService);
  private route = inject(ActivatedRoute);

  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  buscar = signal('');
  buscando = computed(() => this.buscar().trim().length > 0);
  resaltarBusqueda = signal(false);

  tiposExamen = signal<TipoExamen[]>([]);
  medicos = signal<MedicoOpcion[]>([]);
  estados = signal<OpcionCatalogo[]>([]);
  prioridades = signal<OpcionCatalogo[]>([]);

  opcionesLaboratorio =
    MENU_SECTIONS.find((s) => s.slug === 'laboratorio-diagnostico')?.items ?? [];

  constructor() {
    this.laboratorioService.RetornarTiposExamen().subscribe({
      next: (tipos) => {
        console.log('✅ [LaboratorioLista] Tipos de examen cargados:', tipos.length);
        this.tiposExamen.set(tipos);
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [LaboratorioLista] Tipos examen:', err.status),
    });

    this.laboratorioService.RetornarMedicos().subscribe({
      next: (m) => {
        console.log('✅ [LaboratorioLista] Médicos cargados:', m.length);
        this.medicos.set(m);
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [LaboratorioLista] Médicos:', err.status),
    });

    this.laboratorioService.RetornarEstadosOrden().subscribe({
      next: (e) => {
        console.log('✅ [LaboratorioLista] Estados cargados:', e.length);
        this.estados.set(e);
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [LaboratorioLista] Estados:', err.status),
    });

    this.laboratorioService.RetornarPrioridades().subscribe({
      next: (p) => {
        console.log('✅ [LaboratorioLista] Prioridades cargadas:', p.length);
        this.prioridades.set(p);
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [LaboratorioLista] Prioridades:', err.status),
    });

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      if (params.get('foco') !== 'buscar') return;
      this.resaltarBusqueda.set(true);
      queueMicrotask(() => this.searchInput()?.nativeElement.focus());
      setTimeout(() => this.resaltarBusqueda.set(false), 1600);
    });
  }

  ordenes = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.laboratorioService.listar();
    if (!term) return lista;
    return lista.filter((r) =>
      [
        this.nombrePaciente(r.orden.idPaciente),
        this.medicoLabel(r.orden.idMedico),
        this.examenesTexto(r),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

  nombrePaciente(idPaciente: number): string {
    const p = this.pacientesService
      .directorio()
      .find((pac) => pac.idPaciente === idPaciente);
    if (!p) return 'Paciente no encontrado';
    return [p.primerNombre, p.segundoNombre, p.primerApellido, p.segundoApellido]
      .filter(Boolean)
      .join(' ');
  }

  iniciales(idPaciente: number): string {
    const partes = this.nombrePaciente(idPaciente).split(' ').filter(Boolean);
    return `${partes[0]?.charAt(0) ?? ''}${partes[1]?.charAt(0) ?? ''}`.toUpperCase();
  }

  medicoLabel(idMedico: number | null): string {
    if (idMedico == null) return '—';
    return this.medicos().find((m) => m.id === idMedico)?.nombre ?? '—';
  }

  examenesTexto(r: OrdenCompleta): string {
    return r.detalles
      .map((d) => this.tiposExamen().find((t) => t.idTipoExamen === d.idTipoExamen)?.nombre)
      .filter(Boolean)
      .join(', ');
  }

  prioridadLabel(idPrioridad: number | null): string {
    if (idPrioridad == null) return '—';
    return this.prioridades().find((p) => p.id === idPrioridad)?.label ?? '—';
  }

  esUrgente(idPrioridad: number | null): boolean {
    if (idPrioridad == null) return false;
    const label = this.prioridades().find((p) => p.id === idPrioridad)?.label ?? '';
    return label.toLowerCase().includes('urgente');
  }

  estadoLabel(idEstadoOrden: number | null): string {
    if (idEstadoOrden == null) return '—';
    return this.estados().find((e) => e.id === idEstadoOrden)?.label ?? '—';
  }

  estadoClase(idEstadoOrden: number | null): string {
    if (idEstadoOrden == null) return 'estado-solicitada';
    const label = (this.estados().find((e) => e.id === idEstadoOrden)?.label ?? '').toLowerCase();
    if (label.includes('complet')) return 'estado-completada';
    if (label.includes('cancel')) return 'estado-cancelada';
    if (label.includes('proceso')) return 'estado-en-proceso';
    return 'estado-solicitada';
  }

  formatFecha(iso: string): string {
    const fecha = new Date(iso);
    return fecha.toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  eliminar(id: number, paciente: string): void {
    if (!confirm(`¿Eliminar la orden de "${paciente}"?`)) return;
    this.laboratorioService.eliminar(id);
  }
}