import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BitacoraItem, EspecialidadesService } from '../../service/especialidades.service';
import { UsuariosService } from '../../service/usuarios.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';

type Vista = 'activas' | 'eliminadas';

@Component({
  selector: 'app-especialidades-lista',
  imports: [FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './especialidades-lista.html',
  styleUrl: './especialidades-lista.css',
})
export class EspecialidadesLista {
  private especialidadesService = inject(EspecialidadesService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);

  buscar = signal('');
  errorAccion = signal('');

  // ============================================================
  // Historial general de Especialidades
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  // Pestaña "Eliminadas": por ahora cualquiera con sesión la puede ver.
  // TODO: restringir a admin cuando exista control de roles en el frontend.
  vista = signal<Vista>('activas');
  cargandoEliminadas = this.especialidadesService.cargandoEliminadas;
  errorEliminadas = this.especialidadesService.errorEliminadas;

  cargando = computed(() =>
    this.vista() === 'activas' ? this.especialidadesService.cargando() : this.cargandoEliminadas(),
  );
  errorCarga = computed(() =>
    this.vista() === 'activas' ? this.especialidadesService.errorCarga() : this.errorEliminadas(),
  );

  verActivas(): void {
    this.vista.set('activas');
  }

  verEliminadas(): void {
    this.vista.set('eliminadas');
    if (!this.especialidadesService.listarEliminadas().length) {
      this.especialidadesService.cargarEliminadas();
    }
  }

  especialidades = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista =
      this.vista() === 'activas' ? this.especialidadesService.listar() : this.especialidadesService.listarEliminadas();
    if (!term) {
      return lista;
    }
    return lista.filter((e) => e.nombre.toLowerCase().includes(term));
  });

  eliminar(id: number, nombre: string): void {
    if (!confirm(`¿Dar de baja la especialidad "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.especialidadesService.eliminar(id).subscribe({
      next: () => this.notificaciones.exito('Eliminado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  reactivar(id: number, nombre: string): void {
    if (!confirm(`¿Reactivar la especialidad "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.especialidadesService.reactivar(id).subscribe({
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
    this.usuariosService.cargar();

    this.especialidadesService.RetornarBitacoraGeneral('especialidades').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items);
        this.cargandoHistorial.set(false);
      },
      error: (err: Error) => {
        console.error('❌ Error bitácora especialidades:', err);
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
    if (tabla === 'especialidades') return 'Especialidad';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'especialidades') return 'medical_services';
    return 'description';
  }

  usuarioLabel(idUsuario: number | null): string {
    if (idUsuario == null) return 'Sistema';
    return this.usuariosService.obtener(idUsuario)?.nombreUsuario ?? `Usuario #${idUsuario}`;
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
