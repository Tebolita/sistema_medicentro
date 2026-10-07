import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  HospitalizacionesService,
  MedicoOpcion,
  OpcionCatalogo,
} from '../hospitalizaciones.service';
import { CamaOpcion } from '../hospitalizacion-catalogos';
import { PacientesService } from '../../pacientes/pacientes.service';
import { MENU_SECTIONS } from '../../shared/menu-data';

@Component({
  selector: 'app-hospitalizaciones-lista',
  imports: [FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
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

  // Signals con catálogos del backend
  medicosSignal = signal<MedicoOpcion[]>([]);
  estadosSignal = signal<OpcionCatalogo[]>([]);
  camasSignal = signal<CamaOpcion[]>([]);

  opcionesHospitalizacion = MENU_SECTIONS.find((s) => s.slug === 'hospitalizacion')?.items ?? [];

  constructor() {
    // Cargar médicos
    this.hospitalizacionesService.RetornarMedicos().subscribe({
      next: (m) => this.medicosSignal.set(m),
      error: (err: HttpErrorResponse) =>
        console.error('❌ [HospitalizacionesLista] Error médicos:', err.status),
    });

    // Cargar estados
    this.hospitalizacionesService.RetornarEstadosHospitalizacion().subscribe({
      next: (e) => this.estadosSignal.set(e),
      error: (err: HttpErrorResponse) =>
        console.error('❌ [HospitalizacionesLista] Error estados:', err.status),
    });

    // Cargar camas
    this.hospitalizacionesService.RetornarCamas().subscribe({
      next: (c) => this.camasSignal.set(c),
      error: (err: HttpErrorResponse) =>
        console.error('❌ [HospitalizacionesLista] Error camas:', err.status),
    });

    // Query param "foco"
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
      [
        this.nombrePaciente(r.hospitalizacion.idPaciente),
        this.medicoLabel(r.hospitalizacion.idMedicoResponsable),
        r.hospitalizacion.motivoIngreso,
      ]
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
    return this.medicosSignal().find((m) => m.id === idMedico)?.nombre ?? '—';
  }

  camaLabel(idCama: number | null): string {
    if (idCama == null) return '—';
    return this.camasSignal().find((c) => c.id === idCama)?.label ?? '—';
  }

  estadoLabel(idEstadoHospitalizacion: number | null): string {
    if (idEstadoHospitalizacion == null) return '—';
    return this.estadosSignal().find((e) => e.id === idEstadoHospitalizacion)?.label ?? '—';
  }

  estadoClase(idEstadoHospitalizacion: number | null): string {
    const label = this.estadoLabel(idEstadoHospitalizacion).toLowerCase();
    if (label.includes('alta')) return 'estado-alta';
    if (label.includes('traslad')) return 'estado-trasladada';
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