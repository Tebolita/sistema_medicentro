import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BitacoraItem, SalasService } from '../../service/salas.service';
import { CatalogosService } from '../../service/catalogos.service';
import { UsuariosService } from '../../service/usuarios.service';
import { TIPOS_SALA, ESTADOS_SALA } from '../salas-catalogos';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';

type Vista = 'activas' | 'eliminadas';

@Component({
  selector: 'app-salas-lista',
  imports: [FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './salas-lista.html',
  styleUrl: './salas-lista.css',
})
export class SalasLista {
  private salasService = inject(SalasService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);

  private catalogos = inject(CatalogosService);
  private tiposApi = this.catalogos.obtener('TIPO_SALA');
  private tipos = computed(() => {
    const api = this.tiposApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : TIPOS_SALA;
  });
  private estadosApi = this.catalogos.obtener('ESTADO_SALA');
  private estados = computed(() => {
    const api = this.estadosApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : ESTADOS_SALA;
  });

  buscar = signal('');
  errorAccion = signal('');

  // ============================================================
  // Historial general de Salas
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  // Pestaña "Eliminadas": por ahora cualquiera con sesión la puede ver.
  // TODO: restringir a admin cuando exista control de roles en el frontend.
  vista = signal<Vista>('activas');
  cargandoEliminadas = this.salasService.cargandoEliminadas;
  errorEliminadas = this.salasService.errorEliminadas;

  cargando = computed(() => (this.vista() === 'activas' ? this.salasService.cargando() : this.cargandoEliminadas()));
  errorCarga = computed(() => (this.vista() === 'activas' ? this.salasService.errorCarga() : this.errorEliminadas()));

  verActivas(): void {
    this.vista.set('activas');
  }

  verEliminadas(): void {
    this.vista.set('eliminadas');
    if (!this.salasService.listarEliminadas().length) {
      this.salasService.cargarEliminadas();
    }
  }

  salas = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.vista() === 'activas' ? this.salasService.listar() : this.salasService.listarEliminadas();
    if (!term) {
      return lista;
    }
    return lista.filter((s) => s.nombre.toLowerCase().includes(term));
  });

  tipoLabel(idTipoSala: number | null): string {
    if (!idTipoSala) {
      return 'Sin tipo';
    }
    return this.tipos().find((t) => t.id === idTipoSala)?.label ?? '—';
  }

  estadoLabel(idEstadoSala: number): string {
    return this.estados().find((e) => e.id === idEstadoSala)?.label ?? '—';
  }

  // El backend expone idUsuarioCreacion/idUsuarioModificacion en SalaDto,
  // pero (igual que en Medicamentos/Inventario/Facturas) ningún servicio
  // los llena todavía al crear/editar/eliminar — ver punto 5 de
  // SOLICITUD_ENDPOINTS_ELIMINADOS.md. Hasta que se arregle del lado del
  // backend, esto va a mostrar "—" casi siempre.
  usuarioLabel(id: number | null): string {
    if (!id) {
      return '—';
    }
    return this.usuariosService.obtener(id)?.nombreUsuario ?? `Usuario #${id}`;
  }

  eliminar(id: number, nombre: string): void {
    if (!confirm(`¿Dar de baja la sala "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.salasService.eliminar(id).subscribe({
      next: () => this.notificaciones.exito('Eliminado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  reactivar(id: number, nombre: string): void {
    if (!confirm(`¿Reactivar la sala "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.salasService.reactivar(id).subscribe({
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

    this.salasService.RetornarBitacoraGeneral('salas').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items);
        this.cargandoHistorial.set(false);
      },
      error: (err: Error) => {
        console.error('❌ Error bitácora salas:', err);
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
    if (tabla === 'salas') return 'Sala';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'salas') return 'meeting_room';
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
