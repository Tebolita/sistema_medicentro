import { HistorialCambios } from '../../shared/historial-cambios/historial-cambios';
import { tieneCambios } from '../../shared/bitacora-cambios';
import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BitacoraItem, AseguradorasService } from '../../service/aseguradoras.service';
import { UsuariosService } from '../../service/usuarios.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { ConfirmacionService } from '../../shared/confirmacion/confirmacion.service';

type Vista = 'activas' | 'eliminadas';

@Component({
  selector: 'app-aseguradoras-lista',
  imports: [HistorialCambios, FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './aseguradoras-lista.html',
  styleUrl: './aseguradoras-lista.css',
})
export class AseguradorasLista {
  private aseguradorasService = inject(AseguradorasService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);
  private confirmacion = inject(ConfirmacionService);

  buscar = signal('');
  errorAccion = signal('');

  // ============================================================
  // Historial general de Aseguradoras
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  // Pestaña "Eliminadas": por ahora cualquiera con sesión la puede ver.
  // TODO: restringir a admin cuando exista control de roles en el frontend.
  vista = signal<Vista>('activas');
  cargandoEliminadas = this.aseguradorasService.cargandoEliminadas;
  errorEliminadas = this.aseguradorasService.errorEliminadas;

  cargando = computed(() =>
    this.vista() === 'activas' ? this.aseguradorasService.cargando() : this.cargandoEliminadas(),
  );
  errorCarga = computed(() =>
    this.vista() === 'activas' ? this.aseguradorasService.errorCarga() : this.errorEliminadas(),
  );

  verActivas(): void {
    this.vista.set('activas');
  }

  verEliminadas(): void {
    this.vista.set('eliminadas');
    if (!this.aseguradorasService.listarEliminadas().length) {
      this.aseguradorasService.cargarEliminadas();
    }
  }

  aseguradoras = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista =
      this.vista() === 'activas' ? this.aseguradorasService.listar() : this.aseguradorasService.listarEliminadas();
    if (!term) {
      return lista;
    }
    return lista.filter((a) =>
      [a.nombre, a.nit, a.telefono, a.correo].filter(Boolean).join(' ').toLowerCase().includes(term),
    );
  });

  async eliminar(id: number, nombre: string): Promise<void> {
    if (!(await this.confirmacion.confirmar(`¿Dar de baja la aseguradora "${nombre}"?`))) {
      return;
    }
    this.errorAccion.set('');
    this.aseguradorasService.eliminar(id).subscribe({
      next: () => this.notificaciones.exito('Eliminado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  async reactivar(id: number, nombre: string): Promise<void> {
    if (!(await this.confirmacion.confirmar(`¿Reactivar la aseguradora "${nombre}"?`))) {
      return;
    }
    this.errorAccion.set('');
    this.aseguradorasService.reactivar(id).subscribe({
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

    this.aseguradorasService.RetornarBitacoraGeneral('aseguradoras').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items.filter(tieneCambios));
        this.cargandoHistorial.set(false);
      },
      error: (err: Error) => {
        console.error('❌ Error bitácora aseguradoras:', err);
        this.cargandoHistorial.set(false);
        this.notificaciones.error('No se pudo cargar la bitácora');
      },
    });
  }

  cerrarHistorialGeneral(): void {
    this.historialAbierto.set(false);
    this.bitacoraSignal.set([]);
  }

  usuarioLabel(idUsuario: number | null): string {
    if (idUsuario == null) return 'Sistema';
    return this.usuariosService.obtener(idUsuario)?.nombreUsuario ?? `Usuario #${idUsuario}`;
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
    if (tabla === 'aseguradoras') return 'Aseguradora';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'aseguradoras') return 'health_and_safety';
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
