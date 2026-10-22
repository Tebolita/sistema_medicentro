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
import { BitacoraItem, EmpleadosService } from '../../service/empleados.service';
import { PuestosService } from '../../service/puestos.service';
import { ESTADOS_EMPLEADO } from '../empleados-catalogos';
import { CatalogosService } from '../../service/catalogos.service';
import { UsuariosService } from '../../service/usuarios.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';

type Vista = 'activos' | 'eliminados';

@Component({
  selector: 'app-empleados-lista',
  imports: [HistorialCambios, FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './empleados-lista.html',
  styleUrl: './empleados-lista.css',
})
export class EmpleadosLista {
  private empleadosService = inject(EmpleadosService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private puestosService = inject(PuestosService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);

  private catalogos = inject(CatalogosService);
  private estadosApi = this.catalogos.obtener('ESTADO_EMPLEADO');
  private estados = computed(() => {
    const api = this.estadosApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : ESTADOS_EMPLEADO;
  });

  buscar = signal('');
  errorAccion = signal('');

  // Pestaña "Eliminados": por ahora cualquiera con sesión la puede ver.
  // TODO: restringir a admin cuando exista control de roles en el frontend.
  vista = signal<Vista>('activos');
  cargandoEliminados = this.empleadosService.cargandoEliminados;
  errorEliminados = this.empleadosService.errorEliminados;

  cargando = computed(() => (this.vista() === 'activos' ? this.empleadosService.cargando() : this.cargandoEliminados()));
  errorCarga = computed(() => (this.vista() === 'activos' ? this.empleadosService.errorCarga() : this.errorEliminados()));

  verActivos(): void {
    this.vista.set('activos');
  }

  verEliminados(): void {
    this.vista.set('eliminados');
    if (!this.empleadosService.listarEliminados().length) {
      this.empleadosService.cargarEliminados();
    }
  }

  empleados = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.vista() === 'activos' ? this.empleadosService.listar() : this.empleadosService.listarEliminados();
    if (!term) {
      return lista;
    }
    return lista.filter((e) =>
      [e.primerNombre, e.segundoNombre, e.primerApellido, e.segundoApellido, e.correo, e.numeroDocumento]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

  nombreCompleto(idEmpleado: number): string {
    return this.empleadosService.nombreCompleto(idEmpleado);
  }

  puestoLabel(idPuesto: number): string {
    return this.puestosService.obtener(idPuesto)?.nombre ?? '—';
  }

  estadoLabel(idEstadoEmpleado: number): string {
    return this.estados().find((e) => e.id === idEstadoEmpleado)?.label ?? '—';
  }

  eliminar(id: number, nombre: string): void {
    if (!confirm(`¿Dar de baja al empleado "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.empleadosService.eliminar(id).subscribe({
      next: () => this.notificaciones.exito('Eliminado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  reactivar(id: number, nombre: string): void {
    if (!confirm(`¿Reactivar al empleado "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.empleadosService.reactivar(id).subscribe({
      next: () => this.notificaciones.exito('Reactivado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  // ============================================================
  // HISTORIAL GENERAL
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  abrirHistorialGeneral(): void {
    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.empleadosService.RetornarBitacoraGeneral('empleados').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items.filter(tieneCambios));
        this.cargandoHistorial.set(false);
      },
      error: (err: Error) => {
        console.error('❌ Error bitácora empleados:', err);
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
    if (tabla === 'empleados') return 'Empleado';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'empleados') return 'badge';
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
    const u = this.usuariosService.obtener(idUsuario);
    return u?.nombreUsuario ?? `Usuario #${idUsuario}`;
  }
}
