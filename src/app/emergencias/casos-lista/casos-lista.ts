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
  CasoEmergencia,
  CasosEmergenciaService,
  MedicoOpcion,
  OpcionCatalogo,
  UsuarioOpcion,
} from '../../service/casos-emergencia.service';
import { PacientesService } from '../../service/pacientes.service';
import { MENU_SECTIONS } from '../../shared/menu-data';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { ConfirmacionService } from '../../shared/confirmacion/confirmacion.service';

@Component({
  selector: 'app-casos-lista',
  imports: [
    FormsModule,
    NgClass,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './casos-lista.html',
  styleUrl: './casos-lista.css',
})
export class CasosLista {
  private casosService = inject(CasosEmergenciaService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private pacientesService = inject(PacientesService);
  private notif = inject(NotificacionesService);
  private confirmacion = inject(ConfirmacionService);

  buscar = signal('');
  buscando = computed(() => this.buscar().trim().length > 0);

  // ✅ Filtro Activas / Eliminadas
  filtro = signal<'activas' | 'eliminadas'>('activas');

  // Signals con los catálogos traídos del backend
  medicosSignal = signal<MedicoOpcion[]>([]);
  nivelesSignal = signal<OpcionCatalogo[]>([]);
  estadosSignal = signal<OpcionCatalogo[]>([]);
  usuariosSignal = signal<UsuarioOpcion[]>([]);

  // ============================================================
  // Historial general de Emergencias · Casos
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  opcionesEmergencias = (
    MENU_SECTIONS.find((s) => s.slug === 'emergencias')?.items ?? []
  ).filter((item) => item.route !== '/home/emergencias');

  constructor() {
    this.casosService.RetornarMedicos().subscribe({
      next: (m) => this.medicosSignal.set(m),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [CasosLista] Error médicos:', err.status);
        this.notif.error('No se pudieron cargar los médicos');
      },
    });

    this.casosService.RetornarNivelesTriage().subscribe({
      next: (n) => this.nivelesSignal.set(n),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [CasosLista] Error niveles:', err.status);
      },
    });

    this.casosService.RetornarEstadosCaso().subscribe({
      next: (e) => this.estadosSignal.set(e),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [CasosLista] Error estados:', err.status);
      },
    });

    this.casosService.RetornarUsuarios().subscribe({
      next: (u) => this.usuariosSignal.set(u),
      error: (err: HttpErrorResponse) => {
        console.error('❌ [CasosLista] Error usuarios:', err.status);
      },
    });
  }

  // Ordenado por urgencia real del triaje + filtro activas/eliminadas
  casos = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const tab = this.filtro();

    let lista = tab === 'activas'
      ? this.casosService.listar()
      : this.casosService.listarInactivos();

    if (term) {
      lista = lista.filter((c) =>
        [this.nombrePaciente(c), c.motivo]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term),
      );
    }
    const niveles = this.nivelesSignal();
    return [...lista].sort((a, b) => {
      const ia = niveles.findIndex((n) => n.id === a.idNivelTriage);
      const ib = niveles.findIndex((n) => n.id === b.idNivelTriage);
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib);
    });
  });

  nombrePaciente(c: CasoEmergencia): string {
    if (c.idPaciente == null) {
      return c.nombrePaciente || 'Paciente no identificado';
    }
    const p = this.pacientesService.directorio().find((pac) => pac.idPaciente === c.idPaciente);
    if (!p) {
      return 'Paciente no encontrado';
    }
    return [p.primerNombre, p.segundoNombre, p.primerApellido, p.segundoApellido]
      .filter(Boolean)
      .join(' ');
  }

  iniciales(c: CasoEmergencia): string {
    const partes = this.nombrePaciente(c).split(' ').filter(Boolean);
    return `${partes[0]?.charAt(0) ?? ''}${partes[1]?.charAt(0) ?? ''}`.toUpperCase();
  }

  medicoLabel(idMedico: number | null): string {
    if (idMedico == null) return 'Sin asignar';
    return this.medicosSignal().find((m) => m.id === idMedico)?.nombre ?? 'Sin asignar';
  }

  triageLabel(idNivelTriage: number): string {
    return this.nivelesSignal().find((n) => n.id === idNivelTriage)?.label ?? '—';
  }

  triageClase(idNivelTriage: number): string {
    const idx = this.nivelesSignal().findIndex((n) => n.id === idNivelTriage);
    return `triage-${idx >= 0 ? idx + 1 : 0}`;
  }

  estadoLabel(idEstadoCaso: number): string {
    return this.estadosSignal().find((e) => e.id === idEstadoCaso)?.label ?? '—';
  }

  estadoClase(idEstadoCaso: number): string {
    const label = this.estadoLabel(idEstadoCaso).toLowerCase();
    if (label.includes('atendido')) return 'estado-atendido';
    if (label.includes('referid') || label.includes('traslad')) return 'estado-referido';
    if (label.includes('atención') || label.includes('atencion')) return 'estado-en-atencion';
    return 'estado-esperando';
  }

  formatHora(iso: string): string {
    if (!iso) return '—';
    // horaLlegada viene en LOCAL
    return new Date(iso).toLocaleTimeString('es-GT', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * ✅ NUEVO: Formatea una fecha UTC corta para la card (día-mes, hh:mm).
   * Se usa para fechaCreacion y fechaModificacion en la sección de auditoría.
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
   * ✅ Formatea la fecha de eliminación para el tab Eliminadas.
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

  usuarioLabel(idUsuario: number | null | undefined): string {
    if (idUsuario == null) return 'Sistema';
    const u = this.usuariosSignal().find((x) => x.id === idUsuario);
    return u?.nombre ?? `Usuario #${idUsuario}`;
  }

  async eliminar(id: number, paciente: string): Promise<void> {
    if (!(await this.confirmacion.confirmar(`¿Eliminar el caso de "${paciente}"?`))) return;
    this.casosService.eliminar(id);
    this.notif.exito('Caso de emergencia eliminado correctamente');
  }

  async reactivar(id: number): Promise<void> {
    if (!(await this.confirmacion.confirmar('¿Reactivar este caso de emergencia?'))) return;

    this.casosService.reactivar(id).subscribe({
      next: () => {
        this.notif.exito('Caso de emergencia reactivado correctamente');
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error al reactivar caso:', err);
        this.notif.error('No se pudo reactivar el caso');
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

    this.casosService.RetornarBitacoraGeneral('casos_emergencia').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items);
        this.cargandoHistorial.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error bitácora casos:', err.status);
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
    if (tabla === 'casos_emergencia') return 'Caso de emergencia';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'casos_emergencia') return 'emergency';
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