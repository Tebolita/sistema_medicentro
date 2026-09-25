import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { LaboratorioService, OrdenCompleta } from '../laboratorio.service';
import { ESTADOS_ORDEN, PRIORIDADES_ORDEN, TIPOS_EXAMEN } from '../laboratorio-catalogos';
import { MEDICOS } from '../../consultas-externas/consultas-catalogos';
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

  opcionesLaboratorio = MENU_SECTIONS.find((s) => s.slug === 'laboratorio-diagnostico')?.items ?? [];

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      if (params.get('foco') !== 'buscar') {
        return;
      }
      this.resaltarBusqueda.set(true);
      queueMicrotask(() => this.searchInput()?.nativeElement.focus());
      setTimeout(() => this.resaltarBusqueda.set(false), 1600);
    });
  }

  ordenes = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.laboratorioService.listar();
    if (!term) {
      return lista;
    }
    return lista.filter((r) =>
      [this.nombrePaciente(r.orden.idPaciente), this.medicoLabel(r.orden.idMedico), this.examenesTexto(r)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

  nombrePaciente(idPaciente: number): string {
    const p = this.pacientesService.directorio().find((pac) => pac.idPaciente === idPaciente);
    if (!p) {
      return 'Paciente no encontrado';
    }
    return [p.primerNombre, p.segundoNombre, p.primerApellido, p.segundoApellido].filter(Boolean).join(' ');
  }

  iniciales(idPaciente: number): string {
    const partes = this.nombrePaciente(idPaciente).split(' ').filter(Boolean);
    return `${partes[0]?.charAt(0) ?? ''}${partes[1]?.charAt(0) ?? ''}`.toUpperCase();
  }

  medicoLabel(idMedico: number): string {
    return MEDICOS.find((m) => m.id === idMedico)?.nombre ?? '—';
  }

  examenesTexto(r: OrdenCompleta): string {
    return r.detalles
      .map((d) => TIPOS_EXAMEN.find((t) => t.id === d.idTipoExamen)?.nombre)
      .filter(Boolean)
      .join(', ');
  }

  prioridadLabel(idPrioridad: number | null): string {
    return PRIORIDADES_ORDEN.find((p) => p.id === idPrioridad)?.label ?? '—';
  }

  esUrgente(idPrioridad: number | null): boolean {
    return idPrioridad === 2;
  }

  estadoLabel(idEstadoOrden: number): string {
    return ESTADOS_ORDEN.find((e) => e.id === idEstadoOrden)?.label ?? '—';
  }

  estadoClase(idEstadoOrden: number): string {
    if (idEstadoOrden === 3) return 'estado-completada';
    if (idEstadoOrden === 4) return 'estado-cancelada';
    if (idEstadoOrden === 2) return 'estado-en-proceso';
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
    if (!confirm(`¿Eliminar la orden de "${paciente}"?`)) {
      return;
    }
    this.laboratorioService.eliminar(id);
  }
}
