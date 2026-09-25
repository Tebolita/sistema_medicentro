import { computed, inject } from '@angular/core';
import { FacturasService } from '../service/facturas.service';
import { PacientesService } from '../pacientes/pacientes.service';
import { ESTADOS_FACTURA } from '../facturacion/facturacion-catalogos';
import { Alerta, FabricaAlertas } from './alerta.model';

const ESTADO_EMITIDA = 1;
// Una factura emitida sin cobrar por más de estos días se marca como urgente.
const DIAS_URGENTE = 30;

// Alertas de Facturación y Cobros: facturas sin pagar (emitidas con saldo) y
// facturas cuyo estado no corresponde a ninguno del catálogo.
export const alertasFacturacion: FabricaAlertas = () => {
  const facturas = inject(FacturasService);
  const pacientes = inject(PacientesService);

  const nombrePaciente = (id: number): string => {
    const p = pacientes.directorio().find((pac) => pac.idPaciente === id);
    return p ? [p.primerNombre, p.primerApellido].filter(Boolean).join(' ') : `Paciente ${id}`;
  };

  const alertas = computed<Alerta[]>(() => {
    const estadosValidos = new Set(ESTADOS_FACTURA.map((e) => e.id));
    const resultado: Alerta[] = [];

    for (const { factura } of facturas.listar()) {
      const ruta = `/home/facturacion/${factura.idFactura}`;
      const quien = `${factura.numeroDocumento} · ${nombrePaciente(factura.idPaciente)}`;

      if (!factura.idEstadoFactura || !estadosValidos.has(factura.idEstadoFactura)) {
        resultado.push({
          id: `sin-estado-${factura.idFactura}`,
          titulo: 'Factura sin estado',
          detalle: quien,
          severidad: 'alta',
          ruta,
        });
        continue;
      }

      if (factura.idEstadoFactura === ESTADO_EMITIDA) {
        const saldo = factura.total - facturas.totalPagado(factura.idFactura);
        if (saldo <= 0) {
          continue;
        }
        const dias = Math.floor((Date.now() - new Date(factura.fechaEmision).getTime()) / 86_400_000);
        resultado.push({
          id: `sin-pagar-${factura.idFactura}`,
          titulo: 'Factura sin pagar',
          detalle: `${quien} · saldo Q${saldo.toFixed(2)} · hace ${Math.max(dias, 0)} día(s)`,
          severidad: dias > DIAS_URGENTE ? 'alta' : 'media',
          ruta,
        });
      }
    }

    return resultado.sort((a, b) => Number(b.severidad === 'alta') - Number(a.severidad === 'alta'));
  });

  return { alertas, cargar: () => facturas.cargar() };
};
