import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  BitacoraItem,
  CompromisoPago,
  CompromisosPagoService,
  MedicoOpcion,
  OpcionCatalogo,
  UsuarioOpcion,
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
  usuariosSignal = signal<UsuarioOpcion[]>([]);

  // ============================================================
  // Historial general de Compromisos
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  constructor() {
    this.compromisosService.RetornarMedicos().subscribe({
      next: (m) => this.medicosSignal.set(m),
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CompromisosLista] Error médicos:', err.status),
    });

    this.compromisosService.RetornarParentescos().subscribe({
      next: (p) => this.parentescosSignal.set(p),
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CompromisosLista] Error parentescos:', err.status),
    });

    this.compromisosService.RetornarEstadosConsentimiento().subscribe({
      next: (e) => this.estadosSignal.set(e),
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CompromisosLista] Error estados:', err.status),
    });

    this.compromisosService.RetornarUsuarios().subscribe({
      next: (u) => this.usuariosSignal.set(u),
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CompromisosLista] Error usuarios:', err.status),
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

  /**
   * Formatea la fecha en hora local (SIN agregar Z).
   * Para campos del registro (fechaFirma, etc.) que ya vienen en local.
   */
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

  // ============================================================
  // HISTORIAL GENERAL
  // ============================================================

  abrirHistorialGeneral(): void {
    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.compromisosService
      .RetornarBitacoraGeneral('consentimientos_informados')
      .subscribe({
        next: (items) => {
          this.bitacoraSignal.set(items);
          this.cargandoHistorial.set(false);
        },
        error: (err: HttpErrorResponse) => {
          console.error('❌ Error bitácora compromisos:', err.status);
          this.cargandoHistorial.set(false);
        },
      });
  }

  cerrarHistorialGeneral(): void {
    this.historialAbierto.set(false);
    this.bitacoraSignal.set([]);
  }

  accionLabel(idTipoAccion: number): string {
    if (idTipoAccion === 79) return 'Creó';
    if (idTipoAccion === 80) return 'Modificó';
    if (idTipoAccion === 81) return 'Eliminó';
    return 'Cambió';
  }

  accionClase(idTipoAccion: number): string {
    if (idTipoAccion === 79) return 'accion-crear';
    if (idTipoAccion === 80) return 'accion-modificar';
    if (idTipoAccion === 81) return 'accion-eliminar';
    return 'accion-default';
  }

  accionIcono(idTipoAccion: number): string {
    if (idTipoAccion === 79) return 'add_circle';
    if (idTipoAccion === 80) return 'edit';
    if (idTipoAccion === 81) return 'delete';
    return 'history';
  }

  tablaLabel(tabla: string): string {
    if (tabla === 'consentimientos_informados') return 'Compromiso de pago';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'consentimientos_informados') return 'handshake';
    return 'description';
  }

  usuarioLabel(idUsuario: number | null): string {
    if (idUsuario == null) return 'Sistema';
    const u = this.usuariosSignal().find((x) => x.id === idUsuario);
    return u?.nombre ?? `Usuario ${idUsuario}`;
  }

  /**
   * Formatea la fecha/hora de la bitácora.
   * ⚠️ El backend guarda `fechaHora` en UTC.
   * AGREGAMOS la Z para convertir a hora local.
   * NOTA: el HTML llama a este método como formatFechaHoraUTC.
   */
  formatFechaHoraUTC(iso: string): string {
    if (!iso) return '—';
    const isoConZona = iso.endsWith('Z') ? iso : iso + 'Z';
    const fecha = new Date(isoConZona);
    if (isNaN(fecha.getTime())) return '—';
    return fecha.toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}