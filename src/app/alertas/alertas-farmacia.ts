import { computed, inject } from '@angular/core';
import { InventarioFarmaciaService } from '../service/inventario-farmacia.service';
import { Alerta, FabricaAlertas } from './alerta.model';

// Alertas de Farmacia: medicamentos agotados o por debajo del stock mínimo.
export const alertasFarmacia: FabricaAlertas = () => {
  const inventario = inject(InventarioFarmaciaService);

  const alertas = computed<Alerta[]>(() =>
    inventario
      .listar()
      .filter((i) => i.bajoStock || i.stockActual <= 0)
      .map((i) => {
        const agotado = i.stockActual <= 0;
        return {
          id: `stock-${i.idItemInventario}`,
          titulo: agotado ? `Sin stock: ${i.nombre}` : `Bajo stock: ${i.nombre}`,
          detalle: `Stock ${i.stockActual} (mínimo ${i.stockMinimo})`,
          severidad: agotado ? ('alta' as const) : ('media' as const),
          ruta: '/home/farmacia/movimiento-nuevo',
          queryParams: { item: i.idItemInventario },
        };
      })
      .sort((a, b) => Number(b.severidad === 'alta') - Number(a.severidad === 'alta')),
  );

  return { alertas, cargar: () => inventario.cargar() };
};
