import { Injectable, computed, signal } from '@angular/core';
import { ItemInventario, MovimientoInventario } from '../models';
import { TIPO_MOVIMIENTO_ENTRADA } from './farmacia-catalogos';

// TIPO_ITEM_INVENTARIO fijo para "medicamento" — Farmacia solo trabaja con
// ese subconjunto de items_inventario (material de oficina / utensilio
// médico quedan fuera de este módulo).
const TIPO_ITEM_MEDICAMENTO = 1;

@Injectable({ providedIn: 'root' })
export class InventarioFarmaciaService {
  private nextItemId = 5;
  private nextMovimientoId = 4;

  private items = signal<ItemInventario[]>([
    {
      idItemInventario: 1,
      idMedicamento: 1,
      idProveedor: null,
      nombre: 'Amoxicilina 500mg',
      idTipoItem: TIPO_ITEM_MEDICAMENTO,
      idUnidadMedida: 1,
      stockMinimo: 30,
      stockActual: 18,
      idEstadoItem: 1,
      bajoStock: true,
      activo: true,
      fechaCreacion: '2026-06-01T08:00:00',
      fechaModificacion: null,
      idUsuarioCreacion: null,
      idUsuarioModificacion: null,
    },
    {
      idItemInventario: 2,
      idMedicamento: 2,
      idProveedor: null,
      nombre: 'Paracetamol 500mg',
      idTipoItem: TIPO_ITEM_MEDICAMENTO,
      idUnidadMedida: 1,
      stockMinimo: 50,
      stockActual: 220,
      idEstadoItem: 1,
      bajoStock: false,
      activo: true,
      fechaCreacion: '2026-06-01T08:00:00',
      fechaModificacion: null,
      idUsuarioCreacion: null,
      idUsuarioModificacion: null,
    },
    {
      idItemInventario: 3,
      idMedicamento: 5,
      idProveedor: null,
      nombre: 'Ampicilina 1g inyectable',
      idTipoItem: TIPO_ITEM_MEDICAMENTO,
      idUnidadMedida: 3,
      stockMinimo: 20,
      stockActual: 6,
      idEstadoItem: 1,
      bajoStock: true,
      activo: true,
      fechaCreacion: '2026-06-01T08:00:00',
      fechaModificacion: null,
      idUsuarioCreacion: null,
      idUsuarioModificacion: null,
    },
    {
      idItemInventario: 4,
      idMedicamento: 6,
      idProveedor: null,
      nombre: 'Omeprazol 20mg',
      idTipoItem: TIPO_ITEM_MEDICAMENTO,
      idUnidadMedida: 1,
      stockMinimo: 40,
      stockActual: 95,
      idEstadoItem: 1,
      bajoStock: false,
      activo: true,
      fechaCreacion: '2026-06-01T08:00:00',
      fechaModificacion: null,
      idUsuarioCreacion: null,
      idUsuarioModificacion: null,
    },
  ]);

  private movimientos = signal<MovimientoInventario[]>([]);

  listar = computed(() => this.items().filter((i) => i.activo && i.idTipoItem === TIPO_ITEM_MEDICAMENTO));

  bajoStock = computed(() => this.listar().filter((i) => i.bajoStock));

  obtener(id: number): ItemInventario | undefined {
    return this.items().find((i) => i.idItemInventario === id);
  }

  agregarItem(item: Omit<ItemInventario, 'idItemInventario' | 'idTipoItem' | 'bajoStock' | 'activo'>): void {
    const idItemInventario = this.nextItemId++;
    this.items.update((list) => [
      ...list,
      {
        ...item,
        idItemInventario,
        idTipoItem: TIPO_ITEM_MEDICAMENTO,
        bajoStock: item.stockActual <= item.stockMinimo,
        activo: true,
      },
    ]);
  }

  registrarMovimiento(idItemInventario: number, idTipoMovimiento: number, cantidad: number, motivo: string | null): void {
    const idMovimiento = this.nextMovimientoId++;
    this.movimientos.update((list) => [
      ...list,
      {
        idMovimiento,
        idItemInventario,
        idTipoMovimiento,
        cantidad,
        fechaMovimiento: new Date().toISOString(),
        idTratamiento: null,
        motivo,
        activo: true,
        fechaCreacion: new Date().toISOString(),
        idUsuarioCreacion: null,
      },
    ]);

    const delta = idTipoMovimiento === TIPO_MOVIMIENTO_ENTRADA ? cantidad : -cantidad;
    this.items.update((list) =>
      list.map((i) => {
        if (i.idItemInventario !== idItemInventario) {
          return i;
        }
        const stockActual = Math.max(0, i.stockActual + delta);
        return { ...i, stockActual, bajoStock: stockActual <= i.stockMinimo };
      }),
    );
  }

  movimientosDe(idItemInventario: number) {
    return this.movimientos().filter((m) => m.idItemInventario === idItemInventario);
  }
}
