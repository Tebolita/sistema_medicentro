import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BitacoraItem, InventarioFarmaciaService } from '../../service/inventario-farmacia.service';
import { ESTADOS_ITEM_INVENTARIO, UNIDADES_MEDIDA } from '../farmacia-catalogos';
import { MENU_SECTIONS } from '../../shared/menu-data';
import { CatalogosService } from '../../service/catalogos.service';
import { ProveedoresService } from '../../service/proveedores.service';
import { UsuariosService } from '../../service/usuarios.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';

type Vista = 'activos' | 'eliminados';

@Component({
  selector: 'app-inventario-lista',
  imports: [FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './inventario-lista.html',
  styleUrl: './inventario-lista.css',
})
export class InventarioLista {
  private inventarioService = inject(InventarioFarmaciaService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private proveedoresService = inject(ProveedoresService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);

  // Mismo patrón que item-formulario: valores reales del catálogo si existen
  // en la base, si no, la lista de ejemplo.
  private catalogos = inject(CatalogosService);
  private unidadesMedidaApi = this.catalogos.obtener('UNIDAD_MEDIDA');
  private unidadesMedida = computed(() => {
    const api = this.unidadesMedidaApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : UNIDADES_MEDIDA;
  });
  private estadosItemApi = this.catalogos.obtener('ESTADO_ITEM_INVENTARIO');
  private estadosItem = computed(() => {
    const api = this.estadosItemApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : ESTADOS_ITEM_INVENTARIO;
  });

  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  buscar = signal('');
  buscando = computed(() => this.buscar().trim().length > 0);
  resaltarBusqueda = signal(false);

  opcionesFarmacia = MENU_SECTIONS.find((s) => s.slug === 'farmacia')?.items ?? [];

  errorAccion = signal('');

  // Pestaña "Eliminados": por ahora cualquiera con sesión la puede ver.
  // TODO: restringir a admin cuando exista control de roles en el frontend.
  vista = signal<Vista>('activos');
  cargandoEliminados = this.inventarioService.cargandoEliminados;
  errorEliminados = this.inventarioService.errorEliminados;

  cargando = computed(() => (this.vista() === 'activos' ? this.inventarioService.cargando() : this.cargandoEliminados()));
  errorCarga = computed(() => (this.vista() === 'activos' ? this.inventarioService.errorCarga() : this.errorEliminados()));

  // ============================================================
  // Historial general de Items de Inventario
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  constructor() {
    // Solo en el navegador: durante el prerender no hay backend ni sesión.
    afterNextRender(() => this.inventarioService.cargar());
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      if (params.get('foco') !== 'buscar') {
        return;
      }
      this.resaltarBusqueda.set(true);
      queueMicrotask(() => this.searchInput()?.nativeElement.focus());
      setTimeout(() => this.resaltarBusqueda.set(false), 1600);
    });
  }

  items = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.vista() === 'activos' ? this.inventarioService.listar() : this.inventarioService.listarEliminados();
    if (!term) {
      return lista;
    }
    return lista.filter((i) => i.nombre.toLowerCase().includes(term));
  });

  verActivos(): void {
    this.vista.set('activos');
  }

  verEliminados(): void {
    this.vista.set('eliminados');
    // Se pide la primera vez que se entra a la pestaña, no en cada clic.
    if (!this.inventarioService.listarEliminados().length) {
      this.inventarioService.cargarEliminados();
    }
  }

  eliminar(event: Event, idItemInventario: number, nombre: string, stockActual: number): void {
    event.stopPropagation();
    event.preventDefault();
    const mensaje =
      stockActual > 0
        ? `"${nombre}" todavía tiene ${stockActual} unidades en stock.\n\n` +
          `Si lo das de baja, deja de aparecer en el inventario activo pero el stock no se pierde.\n\n` +
          `¿Seguro que deseas darlo de baja de todos modos?`
        : `¿Dar de baja el item "${nombre}"?`;
    if (!confirm(mensaje)) {
      return;
    }
    this.errorAccion.set('');
    this.inventarioService.eliminar(idItemInventario).subscribe({
      next: () => this.notificaciones.exito('Eliminado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  reactivar(event: Event, idItemInventario: number, nombre: string): void {
    event.stopPropagation();
    event.preventDefault();
    if (!confirm(`¿Reactivar el item "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.inventarioService.reactivar(idItemInventario).subscribe({
      next: () => this.notificaciones.exito('Reactivado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  unidadLabel(idUnidadMedida: number): string {
    return this.unidadesMedida().find((u) => u.id === idUnidadMedida)?.label ?? '—';
  }

  estadoLabel(idEstadoItem: number): string {
    return this.estadosItem().find((e) => e.id === idEstadoItem)?.label ?? '—';
  }

  proveedorLabel(idProveedor: number | null): string | null {
    if (!idProveedor) {
      return null;
    }
    return this.proveedoresService.listar().find((p) => p.idProveedor === idProveedor)?.nombre ?? null;
  }

  // Botón "editar" dentro de la tarjeta: evita que el clic también dispare
  // la navegación de la tarjeta completa (que lleva a registrar movimiento).
  editar(event: Event, idItemInventario: number): void {
    event.stopPropagation();
    event.preventDefault();
    this.router.navigate(['/home/farmacia/item', idItemInventario]);
  }

  // Igual que en medicamentos: el backend todavía no llena
  // "idUsuarioCreacion"/"idUsuarioModificacion" con el usuario real (ver
  // SOLICITUD_ENDPOINTS_ELIMINADOS.md punto 5), así que esto muestra "—"
  // hasta que eso se arregle del lado del backend.
  usuarioLabel(id: number | null): string {
    if (!id) {
      return '—';
    }
    return this.usuariosService.obtener(id)?.nombreUsuario ?? `Usuario #${id}`;
  }

  porcentajeStock(stockActual: number, stockMinimo: number): number {
    const referencia = stockMinimo * 3 || 1;
    return Math.min(100, Math.round((stockActual / referencia) * 100));
  }

  // ============================================================
  // HISTORIAL GENERAL
  // ============================================================

  abrirHistorialGeneral(): void {
    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.inventarioService.RetornarBitacoraGeneral('items_inventario').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items);
        this.cargandoHistorial.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error bitácora inventario:', err.status);
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
    if (tabla === 'items_inventario') return 'Item de inventario';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'items_inventario') return 'medication';
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
