import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  CompromisoPago,
  CompromisosPagoService,
  MedicoOpcion,
  OpcionCatalogo,
} from '../compromisos-pago.service';
import { PacientesService } from '../../pacientes/pacientes.service';

@Component({
  selector: 'app-compromisos-lista',
  imports: [
    FormsModule,
    NgClass,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './compromisos-lista.html',
  styleUrl: './compromisos-lista.css',
})
export class CompromisosLista {
  private compromisosService = inject(CompromisosPagoService);
  private pacientesService = inject(PacientesService);

  buscar = signal('');
  buscando = computed(() => this.buscar().trim().length > 0);

  // Signals con catálogos del backend
  medicosSignal = signal<MedicoOpcion[]>([]);
  parentescosSignal = signal<OpcionCatalogo[]>([]);
  estadosSignal = signal<OpcionCatalogo[]>([]);

  constructor() {
    // Cargar médicos
    this.compromisosService.RetornarMedicos().subscribe({
      next: (m) => this.medicosSignal.set(m),
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CompromisosLista] Error médicos:', err.status),
    });

    // Cargar parentescos
    this.compromisosService.RetornarParentescos().subscribe({
      next: (p) => this.parentescosSignal.set(p),
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CompromisosLista] Error parentescos:', err.status),
    });

    // Cargar estados
    this.compromisosService.RetornarEstadosConsentimiento().subscribe({
      next: (e) => this.estadosSignal.set(e),
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CompromisosLista] Error estados:', err.status),
    });
  }

  compromisos = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.compromisosService.listar();
    if (!term) {
      return lista;
    }
    return lista.filter((c) =>
      [this.nombrePaciente(c.consentimiento.idPaciente), c.nombreResponsable]
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

  parentescoLabel(idParentesco: number | null): string {
    if (idParentesco == null) return '—';
    return this.parentescosSignal().find((p) => p.id === idParentesco)?.label ?? '—';
  }

  estadoLabel(idEstadoConsentimiento: number | null): string {
    if (idEstadoConsentimiento == null) return '—';
    return this.estadosSignal().find((e) => e.id === idEstadoConsentimiento)?.label ?? '—';
  }

  estadoClase(idEstadoConsentimiento: number | null): string {
    const label = this.estadoLabel(idEstadoConsentimiento).toLowerCase();
    if (label.includes('firmado')) return 'estado-firmado';
    if (label.includes('revocado')) return 'estado-revocado';
    return 'estado-pendiente';
  }

  formatFecha(iso: string | null): string {
    if (!iso) {
      return 'Sin firmar';
    }
    return new Date(iso).toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  eliminar(id: number, paciente: string): void {
    if (!confirm(`¿Eliminar el compromiso de pago de "${paciente}"?`)) {
      return;
    }
    this.compromisosService.eliminar(id);
  }
}
