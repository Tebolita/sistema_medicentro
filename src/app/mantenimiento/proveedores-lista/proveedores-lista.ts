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
import { BitacoraItem, ProveedoresService } from '../../service/proveedores.service';
import { UsuariosService } from '../../service/usuarios.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';

@Component({
  selector: 'app-proveedores-lista',
  imports: [HistorialCambios, FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './proveedores-lista.html',
  styleUrl: './proveedores-lista.css',
})
export class ProveedoresLista {
  private proveedoresService = inject(ProveedoresService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);

  buscar = signal('');
  errorAccion = signal('');
  cargando = this.proveedoresService.cargando;
  errorCarga = this.proveedoresService.errorCarga;

  // ============================================================
  // Historial general de Proveedores
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  constructor() {
    // Solo en el navegador: durante el prerender no hay backend ni sesión.
    afterNextRender(() => {
      this.proveedoresService.cargar();
      this.usuariosService.cargar();
    });
  }

  proveedores = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.proveedoresService.listar();
    if (!term) {
      return lista;
    }
    return lista.filter((p) =>
      [p.nombre, p.nit, p.telefono, p.correo].filter(Boolean).join(' ').toLowerCase().includes(term),
    );
  });

  eliminar(id: number, nombre: string): void {
    if (!confirm(`¿Dar de baja al proveedor "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.proveedoresService.eliminar(id).subscribe({
      next: () => this.notificaciones.exito('Eliminado correctamente'),
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

    this.proveedoresService.RetornarBitacoraGeneral('proveedores').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items.filter(tieneCambios));
        this.cargandoHistorial.set(false);
      },
      error: (err: Error) => {
        console.error('❌ Error bitácora proveedores:', err.message);
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
    if (tabla === 'proveedores') return 'Proveedor';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'proveedores') return 'local_shipping';
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
