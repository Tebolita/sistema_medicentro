import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BitacoraItem, MedicamentosService } from '../../service/medicamentos.service';
import { InventarioFarmaciaService } from '../../service/inventario-farmacia.service';
import { UsuariosService } from '../../service/usuarios.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { ConfirmacionService } from '../../shared/confirmacion/confirmacion.service';

type Vista = 'activos' | 'eliminados';

@Component({
  selector: 'app-medicamentos-lista',
  imports: [FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './medicamentos-lista.html',
  styleUrl: './medicamentos-lista.css',
})
export class MedicamentosLista {
  private medicamentosService = inject(MedicamentosService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private inventarioService = inject(InventarioFarmaciaService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);
  private confirmacion = inject(ConfirmacionService);

  buscar = signal('');
  errorAccion = signal('');

  // Pestaña "Eliminados": por ahora cualquiera con sesión la puede ver.
  // TODO: restringir a admin cuando exista control de roles en el frontend.
  vista = signal<Vista>('activos');
  cargandoEliminados = this.medicamentosService.cargandoEliminados;
  errorEliminados = this.medicamentosService.errorEliminados;

  cargando = computed(() => (this.vista() === 'activos' ? this.medicamentosService.cargando() : this.cargandoEliminados()));
  errorCarga = computed(() => (this.vista() === 'activos' ? this.medicamentosService.errorCarga() : this.errorEliminados()));

  // ============================================================
  // Historial general de Medicamentos
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  constructor() {
    // Solo en el navegador: durante el prerender no hay backend ni sesión.
    afterNextRender(() => {
      this.medicamentosService.cargar();
      this.inventarioService.cargar();
    });
  }

  verActivos(): void {
    this.vista.set('activos');
  }

  verEliminados(): void {
    this.vista.set('eliminados');
    // Se pide la primera vez que se entra a la pestaña, no en cada clic.
    if (!this.medicamentosService.listarEliminados().length) {
      this.medicamentosService.cargarEliminados();
    }
  }

  medicamentos = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.vista() === 'activos' ? this.medicamentosService.listar() : this.medicamentosService.listarEliminados();
    if (!term) {
      return lista;
    }
    return lista.filter((m) =>
      [m.nombre, m.principioActivo, m.presentacion].filter(Boolean).join(' ').toLowerCase().includes(term),
    );
  });

  // Stock de inventario todavía ligado a este medicamento (para avisar antes
  // de dar de baja). Un medicamento puede tener más de un item de inventario
  // (distintas presentaciones/proveedores), así que se suma todo.
  private stockVinculado(idMedicamento: number): { total: number; items: string[] } {
    const items = this.inventarioService
      .listar()
      .filter((i) => i.idMedicamento === idMedicamento && i.stockActual > 0);
    return { total: items.reduce((suma, i) => suma + i.stockActual, 0), items: items.map((i) => i.nombre) };
  }

  async eliminar(id: number, nombre: string): Promise<void> {
    const { total, items } = this.stockVinculado(id);
    const mensaje =
      total > 0
        ? `"${nombre}" todavía tiene ${total} unidades en inventario (${items.join(', ')}).\n\n` +
          `Si lo das de baja, seguirá apareciendo en ese inventario pero ya no se podrá recetar ni agregar a nuevos items.\n\n` +
          `¿Seguro que deseas darlo de baja de todos modos?`
        : `¿Dar de baja el medicamento "${nombre}"?`;

    if (!(await this.confirmacion.confirmar(mensaje))) {
      return;
    }
    this.errorAccion.set('');
    this.medicamentosService.eliminar(id).subscribe({
      next: () => this.notificaciones.exito('Eliminado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  // El backend expone "idUsuarioCreacion"/"idUsuarioModificacion" en el
  // medicamento, pero todavía no los llena con el usuario real que hizo la
  // acción (ver SOLICITUD_ENDPOINTS_ELIMINADOS.md punto 5): hasta que eso se
  // arregle del lado del backend, esto va a mostrar "—" casi siempre.
  usuarioLabel(id: number | null): string {
    if (!id) {
      return '—';
    }
    return this.usuariosService.obtener(id)?.nombreUsuario ?? `Usuario #${id}`;
  }

  async reactivar(id: number, nombre: string): Promise<void> {
    if (!(await this.confirmacion.confirmar(`¿Reactivar el medicamento "${nombre}"?`))) {
      return;
    }
    this.errorAccion.set('');
    this.medicamentosService.reactivar(id).subscribe({
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

    this.medicamentosService.RetornarBitacoraGeneral('medicamentos').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items);
        this.cargandoHistorial.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error bitácora medicamentos:', err.status);
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
    if (tabla === 'medicamentos') return 'Medicamento';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'medicamentos') return 'medication';
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
