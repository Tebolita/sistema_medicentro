import { HistorialCambios } from '../../shared/historial-cambios/historial-cambios';
import { tieneCambios } from '../../shared/bitacora-cambios';
import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  BitacoraItem,
  DIAS_SEMANA,
  DisponibilidadesService,
  UsuarioOpcion,
} from '../../service/disponibilidades.service';
import { MedicosService } from '../../service/medicos.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';

type Vista = 'activas' | 'eliminadas';

@Component({
  selector: 'app-disponibilidad-lista',
  imports: [HistorialCambios, FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './disponibilidad-lista.html',
  styleUrl: './disponibilidad-lista.css',
})
export class DisponibilidadLista {
  private disponibilidadesService = inject(DisponibilidadesService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private medicosService = inject(MedicosService);
  private notificaciones = inject(NotificacionesService);

  buscar = signal('');
  errorAccion = signal('');

  // Pestaña "Eliminadas": por ahora cualquiera con sesión la puede ver.
  // TODO: restringir a admin cuando exista control de roles en el frontend.
  vista = signal<Vista>('activas');
  cargandoEliminadas = this.disponibilidadesService.cargandoEliminadas;
  errorEliminadas = this.disponibilidadesService.errorEliminadas;

  cargando = computed(() => (this.vista() === 'activas' ? this.disponibilidadesService.cargando() : this.cargandoEliminadas()));
  errorCarga = computed(() => (this.vista() === 'activas' ? this.disponibilidadesService.errorCarga() : this.errorEliminadas()));

  // ============================================================
  // Historial general de Disponibilidad Médica
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);
  usuariosSignal = signal<UsuarioOpcion[]>([]);

  constructor() {
    afterNextRender(() => this.medicosService.cargar());

    this.disponibilidadesService.RetornarUsuarios().subscribe({
      next: (u) => this.usuariosSignal.set(u),
      error: (err) => {
        console.error('❌ [DisponibilidadLista] Error usuarios:', err);
      },
    });
  }

  verActivas(): void {
    this.vista.set('activas');
  }

  verEliminadas(): void {
    this.vista.set('eliminadas');
    if (!this.disponibilidadesService.listarEliminadas().length) {
      this.disponibilidadesService.cargarEliminadas();
    }
  }

  diaLabel(idDiaSemana: number): string {
    return DIAS_SEMANA.find((d) => d.id === idDiaSemana)?.label ?? `Día ${idDiaSemana}`;
  }

  medicoNombre(idMedico: number): string {
    return this.medicosService.nombreDe(idMedico);
  }

  disponibilidades = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.vista() === 'activas' ? this.disponibilidadesService.listar() : this.disponibilidadesService.listarEliminadas();
    if (!term) {
      return lista;
    }
    return lista.filter((d) =>
      [this.medicoNombre(d.idMedico), this.diaLabel(d.idDiaSemana)].join(' ').toLowerCase().includes(term),
    );
  });

  eliminar(id: number, etiqueta: string): void {
    if (!confirm(`¿Dar de baja la disponibilidad de "${etiqueta}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.disponibilidadesService.eliminar(id).subscribe({
      next: () => this.notificaciones.exito('Eliminado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  reactivar(id: number, etiqueta: string): void {
    if (!confirm(`¿Reactivar la disponibilidad de "${etiqueta}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.disponibilidadesService.reactivar(id).subscribe({
      next: () => this.notificaciones.exito('Reactivado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  // ============================================================
  // HISTORIAL GENERAL
  // ============================================================

  abrirHistorialGeneral(): void {
    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.disponibilidadesService.RetornarBitacoraGeneral('disponibilidad_medico').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items.filter(tieneCambios));
        this.cargandoHistorial.set(false);
      },
      error: (err) => {
        console.error('❌ Error bitácora disponibilidad:', err);
        this.cargandoHistorial.set(false);
        this.notificaciones.error('No se pudo cargar la bitácora');
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
    if (tabla === 'disponibilidad_medico') return 'Disponibilidad médica';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'disponibilidad_medico') return 'event_available';
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

  usuarioLabel(idUsuario: number | null): string {
    if (idUsuario == null) return 'Sistema';
    const u = this.usuariosSignal().find((x) => x.id === idUsuario);
    return u?.nombre ?? `Usuario #${idUsuario}`;
  }
}
