import { Component, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { InventarioFarmaciaService } from '../../service/inventario-farmacia.service';
import { CatalogosService } from '../../service/catalogos.service';
import { TIPOS_MOVIMIENTO, TIPO_MOVIMIENTO_ENTRADA } from '../farmacia-catalogos';
import { MovimientoDetalleDialog } from './movimiento-detalle-dialog';
import { MovimientoInventario } from '../../models';

@Component({
  selector: 'app-movimientos-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatDialogModule],
  templateUrl: './movimientos-lista.html',
  styleUrl: './movimientos-lista.css',
})
export class MovimientosLista {
  private inventarioService = inject(InventarioFarmaciaService);
  private catalogos = inject(CatalogosService);
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);

  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  buscar = signal('');
  buscando = computed(() => this.buscar().trim().length > 0);
  resaltarBusqueda = signal(false);

  cargando = this.inventarioService.cargandoMovimientos;
  errorCarga = this.inventarioService.errorMovimientos;

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
}
