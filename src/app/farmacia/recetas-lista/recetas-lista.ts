import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RecetaCompleta, RecetasService } from '../recetas.service';
import { ESTADOS_RECETA, MEDICAMENTOS } from '../farmacia-catalogos';
import { MEDICOS } from '../../consultas-externas/consultas-catalogos';
import { PacientesService } from '../../pacientes/pacientes.service';

@Component({
  selector: 'app-recetas-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './recetas-lista.html',
  styleUrl: './recetas-lista.css',
})
export class RecetasLista {
  private recetasService = inject(RecetasService);
  private pacientesService = inject(PacientesService);
  private route = inject(ActivatedRoute);

  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  buscar = signal('');
  buscando = computed(() => this.buscar().trim().length > 0);
  resaltarBusqueda = signal(false);

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

  recetas = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.recetasService.listar();
    if (!term) {
      return lista;
    }
    return lista.filter((r) =>
      [this.nombrePaciente(r.receta.idPaciente), this.medicamentosTexto(r)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

  nombrePaciente(idPaciente: number): string {
    const p = this.pacientesService.listar().find((pac) => pac.idPaciente === idPaciente);
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

  medicamentosTexto(r: RecetaCompleta): string {
    return r.detalles
      .map((d) => MEDICAMENTOS.find((m) => m.id === d.idMedicamento)?.nombre)
      .filter(Boolean)
      .join(', ');
  }

  estadoLabel(idEstadoReceta: number): string {
    return ESTADOS_RECETA.find((e) => e.id === idEstadoReceta)?.label ?? '—';
  }

  estadoClase(idEstadoReceta: number): string {
    if (idEstadoReceta === 2) return 'estado-surtida';
    if (idEstadoReceta === 3) return 'estado-cancelada';
    return 'estado-emitida';
  }

  formatFecha(iso: string): string {
    return new Date(iso).toLocaleString('es-GT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  eliminar(id: number, paciente: string): void {
    if (!confirm(`¿Eliminar la receta de "${paciente}"?`)) {
      return;
    }
    this.recetasService.eliminar(id);
  }
}
