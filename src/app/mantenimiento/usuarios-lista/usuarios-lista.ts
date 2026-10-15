import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BitacoraItem, UsuariosService } from '../../service/usuarios.service';
import { CatalogosService } from '../../service/catalogos.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';

// ESTADO_USUARIO ya se siembra junto con el usuario inicial
// (scripts/insertar_usuario.sql): ACTIVO / BLOQUEADO / INACTIVO.
const ESTADOS_USUARIO_EJEMPLO = [
  { id: 1, label: 'Activo' },
  { id: 2, label: 'Bloqueado' },
  { id: 3, label: 'Inactivo' },
];

@Component({
  selector: 'app-usuarios-lista',
  imports: [FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './usuarios-lista.html',
  styleUrl: './usuarios-lista.css',
})
export class UsuariosLista {
  private usuariosService = inject(UsuariosService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private notificaciones = inject(NotificacionesService);

  buscar = signal('');
  errorAccion = signal('');
  cargando = this.usuariosService.cargando;
  errorCarga = this.usuariosService.errorCarga;

  private catalogos = inject(CatalogosService);
  private estadosApi = this.catalogos.obtener('ESTADO_USUARIO');
  private estados = computed(() => {
    const api = this.estadosApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : ESTADOS_USUARIO_EJEMPLO;
  });

  // ============================================================
  // Historial general de Usuarios
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  constructor() {
    // Solo en el navegador: durante el prerender no hay backend ni sesión.
    afterNextRender(() => this.usuariosService.cargar());
  }

  usuarios = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.usuariosService.listar();
    if (!term) {
      return lista;
    }
    return lista.filter((u) => [u.nombreUsuario, u.correo].join(' ').toLowerCase().includes(term));
  });

  estadoLabel(idEstadoUsuario: number): string {
    return this.estados().find((e) => e.id === idEstadoUsuario)?.label ?? '—';
  }

  eliminar(id: number, nombre: string): void {
    if (!confirm(`¿Dar de baja al usuario "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.usuariosService.eliminar(id).subscribe({
      next: () => this.notificaciones.exito('Eliminado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  usuarioLabel(id: number | null): string {
    if (!id) return 'Sistema';
    return this.usuariosService.obtener(id)?.nombreUsuario ?? `Usuario #${id}`;
  }

  // ============================================================
  // HISTORIAL GENERAL
  // ============================================================

  abrirHistorialGeneral(): void {
    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.usuariosService.RetornarBitacoraGeneral('usuarios').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items);
        this.cargandoHistorial.set(false);
      },
      error: (err: Error) => {
        console.error('❌ Error bitácora usuarios:', err);
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
    if (tabla === 'usuarios') return 'Usuario';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'usuarios') return 'person';
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
