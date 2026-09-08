import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HospitalizacionesService } from '../hospitalizaciones.service';
import { CAMAS, ESTADOS_HOSPITALIZACION } from '../hospitalizacion-catalogos';
import { MEDICOS } from '../../consultas-externas/consultas-catalogos';
import { PacientesService } from '../../pacientes/pacientes.service';
import { MENU_SECTIONS } from '../../shared/menu-data';

@Component({
  selector: 'app-hospitalizaciones-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './hospitalizaciones-lista.html',
  styleUrl: './hospitalizaciones-lista.css',
})
export class HospitalizacionesLista {
  private hospitalizacionesService = inject(HospitalizacionesService);
  private pacientesService = inject(PacientesService);
  private route = inject(ActivatedRoute);

  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  buscar = signal('');
  buscando = computed(() => this.buscar().trim().length > 0);
  resaltarBusqueda = signal(false);

  opcionesHospitalizacion = MENU_SECTIONS.find((s) => s.slug === 'hospitalizacion')?.items ?? [];

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

  hospitalizaciones = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.hospitalizacionesService.listar();
    if (!term) {
      return lista;
    }
    return lista.filter((r) =>
      [this.nombrePaciente(r.hospitalizacion.idPaciente), this.medicoLabel(r.hospitalizacion.idMedicoResponsable), r.hospitalizacion.motivoIngreso]
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

  camaLabel(idCama: number): string {
    return CAMAS.find((c) => c.id === idCama)?.label ?? '—';
  }

  estadoLabel(idEstadoHospitalizacion: number): string {
    return ESTADOS_HOSPITALIZACION.find((e) => e.id === idEstadoHospitalizacion)?.label ?? '—';
  }

  estadoClase(idEstadoHospitalizacion: number): string {
    if (idEstadoHospitalizacion === 2) return 'estado-alta';
    if (idEstadoHospitalizacion === 3) return 'estado-trasladada';
    return 'estado-activa';
  }

  formatFecha(iso: string | null): string {
    if (!iso) {
      return '—';
    }
    return new Date(iso).toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  eliminar(id: number, paciente: string): void {
    if (!confirm(`¿Eliminar el registro de hospitalización de "${paciente}"?`)) {
      return;
    }
    this.hospitalizacionesService.eliminar(id);
  }
}
