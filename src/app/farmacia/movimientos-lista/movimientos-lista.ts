import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BitacoraItem, InventarioFarmaciaService } from '../../service/inventario-farmacia.service';
import { CatalogosService } from '../../service/catalogos.service';
import { TIPOS_MOVIMIENTO, TIPO_MOVIMIENTO_ENTRADA } from '../farmacia-catalogos';
import { MovimientoDetalleDialog } from './movimiento-detalle-dialog';
import { MovimientoInventario } from '../../models';
import { UsuariosService } from '../../service/usuarios.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';

@Component({
  selector: 'app-movimientos-lista',
  imports: [FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule, MatDialogModule],
  templateUrl: './movimientos-lista.html',
  styleUrl: './movimientos-lista.css',
})
export class MovimientosLista {
  private inventarioService = inject(InventarioFarmaciaService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private catalogos = inject(CatalogosService);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);

  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  buscar = signal('');
  buscando = computed(() => this.buscar().trim().length > 0);
  resaltarBusqueda = signal(false);

  cargando = this.inventarioService.cargandoMovimientos;
  errorCarga = this.inventarioService.errorMovimientos;

  // ============================================================
  // Historial general de Movimientos de Inventario
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  // TIPO_MOVIMIENTO_INVENTARIO real si el catálogo existe; si no, la lista
  // de ejemplo (mismo patrón que en movimiento-formulario).
  private tiposMovimientoApi = this.catalogos.obtener('TIPO_MOVIMIENTO_INVENTARIO');
  private tiposMovimiento = computed(() => {
    const api = this.tiposMovimientoApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : TIPOS_MOVIMIENTO;
  });

  constructor() {
    // Solo en el navegador: durante el prerender no hay backend ni sesión.
    afterNextRender(() => this.inventarioService.cargarMovimientos());

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      if (params.get('foco') !== 'buscar') {
        return;
      }
      this.resaltarBusqueda.set(true);
      queueMicrotask(() => this.searchInput()?.nativeElement.focus());
      setTimeout(() => this.resaltarBusqueda.set(false), 1600);
    });
  }

  movimientos = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.inventarioService.listarMovimientos();
    if (!term) {
      return lista;
    }
    return lista.filter((m) =>
      [this.nombreItem(m.idItemInventario), m.motivo, this.tipoLabel(m.idTipoMovimiento)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

  nombreItem(idItemInventario: number): string {
    return this.inventarioService.obtener(idItemInventario)?.nombre ?? 'Medicamento no encontrado';
  }

  tipoLabel(idTipoMovimiento: number): string {
    return this.tiposMovimiento().find((t) => t.id === idTipoMovimiento)?.label ?? '—';
  }

  esEntrada(idTipoMovimiento: number): boolean {
    const idEntrada = this.catalogos.idPorCodigo('TIPO_MOVIMIENTO_INVENTARIO', 'ENTRADA') ?? TIPO_MOVIMIENTO_ENTRADA;
    return idTipoMovimiento === idEntrada;
  }

  formatFecha(iso: string): string {
    return new Date(iso).toLocaleString('es-GT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  // Centraliza el detalle del movimiento en un popup en vez de dejarlo solo
  // en la fila resumida de la lista.
  verDetalle(m: MovimientoInventario): void {
    this.dialog.open(MovimientoDetalleDialog, {
      autoFocus: false,
      data: {
        movimiento: m,
        nombreItem: this.nombreItem(m.idItemInventario),
        tipoLabel: this.tipoLabel(m.idTipoMovimiento),
        esEntrada: this.esEntrada(m.idTipoMovimiento),
        stockActual: this.inventarioService.obtener(m.idItemInventario)?.stockActual ?? null,
      },
    });
  }

  // El backend todavía no llena "idUsuarioCreacion" con el usuario real en
  // todos los casos (ver SOLICITUD_ENDPOINTS_ELIMINADOS.md punto 5), así que
  // esto puede mostrar "—" hasta que eso se arregle del lado del backend.
  usuarioLabel(id: number | null): string {
    if (!id) {
      return '—';
    }
    return this.usuariosService.obtener(id)?.nombreUsuario ?? `Usuario #${id}`;
  }

  // ============================================================
  // HISTORIAL GENERAL
  // ============================================================

  abrirHistorialGeneral(): void {
    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.inventarioService.RetornarBitacoraGeneral('movimientos_inventario').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items);
        this.cargandoHistorial.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error bitácora movimientos:', err.status);
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
    if (tabla === 'movimientos_inventario') return 'Movimiento de inventario';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'movimientos_inventario') return 'swap_vert';
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
