import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
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
} from '../../service/compromisos-pago.service';
import { PacientesService } from '../../service/pacientes.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { ConfirmacionService } from '../../shared/confirmacion/confirmacion.service';

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
  private accionAuditoria = inject(AuditoriaAccionService);
  private pacientesService = inject(PacientesService);
  private notif = inject(NotificacionesService);
  private confirmacion = inject(ConfirmacionService);

  buscar = signal('');
  buscando = computed(() => this.buscar().trim().length > 0);

  // ✅ Filtro Activas / Eliminadas
  filtro = signal<'activas' | 'eliminadas'>('activas');

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
      error: (err: HttpErrorResponse) => {
        console.error('❌ [CompromisosLista] Error médicos:', err.status);
        this.notif.error('No se pudieron cargar los médicos');
      },
    });

    this.compromisosService.RetornarParentescos().subscribe({
      next: (p) => this.parentescosSignal.set(p),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [CompromisosLista] Error parentescos:', err.status);
      },
    });

    this.compromisosService.RetornarEstadosConsentimiento().subscribe({
      next: (e) => this.estadosSignal.set(e),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [CompromisosLista] Error estados:', err.status);
      },
    });

    this.compromisosService.RetornarUsuarios().subscribe({
      next: (u) => this.usuariosSignal.set(u),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [CompromisosLista] Error usuarios:', err.status);
      },
    });
  }

  compromisos = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const tab = this.filtro();

    const lista = tab === 'activas'
      ? this.compromisosService.listar()
      : this.compromisosService.listarInactivos();

    if (!term) return lista;

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

  // ============================================================
  // HELPERS DE FECHAS — 2 convenciones distintas del backend
  // ============================================================

  /**
   * ✅ Para fechas del BACKEND (fechaCreacion, fechaModificacion).
   * Estas vienen en UTC SIN la Z. Agregamos la Z para convertir a hora local.
   */
  formatFechaUTC(iso: string | null): string {
    if (!iso) return '—';
    const isoConZona = iso.endsWith('Z') ? iso : iso + 'Z';
    const fecha = new Date(isoConZona);
    if (isNaN(fecha.getTime())) return '—';
    return fecha.toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * ✅ Para fechas LOCALES del FORMULARIO (fechaFirma).
   * El backend las guarda tal cual las manda el frontend (hora local GT).
   * NO agregamos la Z.
   */
  formatFechaLocal(iso: string | null): string {
    if (!iso) return 'Sin firmar';
    const fecha = new Date(iso);
    if (isNaN(fecha.getTime())) return 'Sin firmar';
    return fecha.toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * Alias — usado en el HTML para fechaFirma (que viene en local).
   */
  formatFecha(iso: string | null): string {
    return this.formatFechaLocal(iso);
  }

  /**
   * ✅ Formatea la fecha de eliminación para el tab Eliminadas.
   * Usa fechaModificacion (que viene en UTC).
   * Ej: "el 13-oct, 18:21"
   */
  formatFechaEliminacion(iso: string | null): string {
    if (!iso) return '—';
    const isoConZona = iso.endsWith('Z') ? iso : iso + 'Z';
    const fecha = new Date(isoConZona);
    if (isNaN(fecha.getTime())) return '—';
    return `el ${fecha.toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  }

  /**
   * ✅ Devuelve el nombre del usuario que eliminó el registro.
   */
  usuarioLabel(idUsuario: number | null): string {
    if (idUsuario == null) return 'Sistema';
    const u = this.usuariosSignal().find((x) => x.id === idUsuario);
    return u?.nombre ?? `Usuario #${idUsuario}`;
  }

  async eliminar(id: number, paciente: string): Promise<void> {
    if (!(await this.confirmacion.confirmar(`¿Eliminar el compromiso de pago de "${paciente}"?`))) return;
    this.compromisosService.eliminar(id);
    this.notif.exito('Compromiso de pago eliminado correctamente');
  }

  /**
   * ✅ Reactiva un compromiso eliminado.
   */
  async reactivar(id: number): Promise<void> {
    if (!(await this.confirmacion.confirmar('¿Reactivar este compromiso de pago?'))) return;

    this.compromisosService.reactivar(id).subscribe({
      next: () => {
        this.notif.exito('Compromiso de pago reactivado correctamente');
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error al reactivar compromiso:', err);
        this.notif.error('No se pudo reactivar el compromiso');
      },
    });
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
          this.notif.error('No se pudo cargar la bitácora');
        },
      });
  }

  cerrarHistorialGeneral(): void {
    this.historialAbierto.set(false);
    this.bitacoraSignal.set([]);
  }

  accionLabel(idTipoAccion: number): string {
    return this.accionAuditoria.label(idTipoAccion);
  }

  accionClase(idTipoAccion: number): string {
    return this.accionAuditoria.clase(idTipoAccion);
  }

  accionIcono(idTipoAccion: number): string {
    return this.accionAuditoria.icono(idTipoAccion);
  }

  tablaLabel(tabla: string): string {
    if (tabla === 'consentimientos_informados') return 'Compromiso de pago';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'consentimientos_informados') return 'handshake';
    return 'description';
  }

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