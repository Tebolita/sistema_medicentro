import { Injectable, computed, signal } from '@angular/core';
import { Factura, FacturaDetalle } from '../models';

export interface FacturaCompleta {
  factura: Factura;
  detalles: FacturaDetalle[];
}

@Injectable({ providedIn: 'root' })
export class FacturasService {
  private nextFacturaId = 3;
  private nextDetalleId = 4;

  private registros = signal<FacturaCompleta[]>([
    {
      factura: {
        idFactura: 1,
        idPaciente: 1,
        idTipoDocumentoFiscal: 1,
        serie: 'A',
        numeroDocumento: 'FAC-0001',
        fechaEmision: '2026-09-05T10:30:00',
        subtotal: 350,
        descuento: 0,
        impuesto: 42,
        total: 392,
        idEstadoFactura: 2,
        numeroAutorizacionFel: 'FEL-88213-SAT',
        fechaCertificacionFel: '2026-09-05T10:31:00',
        idConvenio: null,
        idPoliza: null,
        activo: true,
        fechaCreacion: '2026-09-05T10:30:00',
        fechaModificacion: null,
        idUsuarioCreacion: null,
        idUsuarioModificacion: null,
      },
      detalles: [
        {
          idFacturaDetalle: 1,
          idFactura: 1,
          idTipoItem: 1,
          idCita: null,
          idTratamiento: null,
          idMedicamento: null,
          descripcion: 'Consulta externa - Medicina General',
          cantidad: 1,
          precioUnitario: 250,
          descuento: 0,
          subtotal: 250,
          activo: true,
          fechaCreacion: '2026-09-05T10:30:00',
        },
        {
          idFacturaDetalle: 2,
          idFactura: 1,
          idTipoItem: 3,
          idCita: null,
          idTratamiento: null,
          idMedicamento: null,
          descripcion: 'Amoxicilina 500mg (10 cápsulas)',
          cantidad: 1,
          precioUnitario: 100,
          descuento: 0,
          subtotal: 100,
          activo: true,
          fechaCreacion: '2026-09-05T10:30:00',
        },
      ],
    },
    {
      factura: {
        idFactura: 2,
        idPaciente: 2,
        idTipoDocumentoFiscal: 1,
        serie: 'A',
        numeroDocumento: 'FAC-0002',
        fechaEmision: '2026-09-06T16:00:00',
        subtotal: 150,
        descuento: 0,
        impuesto: 18,
        total: 168,
        idEstadoFactura: 1,
        numeroAutorizacionFel: 'FEL-88214-DIGEFACT',
        fechaCertificacionFel: '2026-09-06T16:01:00',
        idConvenio: null,
        idPoliza: 2,
        activo: true,
        fechaCreacion: '2026-09-06T16:00:00',
        fechaModificacion: null,
        idUsuarioCreacion: null,
        idUsuarioModificacion: null,
      },
      detalles: [
        {
          idFacturaDetalle: 3,
          idFactura: 2,
          idTipoItem: 1,
          idCita: null,
          idTratamiento: null,
          idMedicamento: null,
          descripcion: 'Consulta externa - Copago Mi Cope',
          cantidad: 1,
          precioUnitario: 150,
          descuento: 0,
          subtotal: 150,
          activo: true,
          fechaCreacion: '2026-09-06T16:00:00',
        },
      ],
    },
  ]);

  private pagos = signal<import('../models').Pago[]>([
    {
      idPago: 1,
      idFactura: 1,
      fechaPago: '2026-09-05T10:35:00',
      monto: 392,
      idFormaPago: 1,
      idEstadoPago: 1,
      referenciaPago: null,
      observaciones: null,
      activo: true,
      fechaCreacion: '2026-09-05T10:35:00',
      fechaModificacion: null,
      idUsuarioCreacion: null,
      idUsuarioModificacion: null,
    },
  ]);

  listar = computed(() =>
    this.registros()
      .filter((r) => r.factura.activo)
      .sort((a, b) => b.factura.fechaEmision.localeCompare(a.factura.fechaEmision)),
  );

  listarPagos = computed(() =>
    this.pagos()
      .filter((p) => p.activo)
      .sort((a, b) => b.fechaPago.localeCompare(a.fechaPago)),
  );

  obtener(id: number): FacturaCompleta | undefined {
    return this.registros().find((r) => r.factura.idFactura === id);
  }

  pagosDe(idFactura: number) {
    return this.listarPagos().filter((p) => p.idFactura === idFactura);
  }

  totalPagado(idFactura: number): number {
    return this.pagosDe(idFactura)
      .filter((p) => p.idEstadoPago === 1)
      .reduce((sum, p) => sum + p.monto, 0);
  }

  guardar(registro: FacturaCompleta): number {
    const esNueva = registro.factura.idFactura === 0;
    if (esNueva) {
      const idFactura = this.nextFacturaId++;
      const nueva: FacturaCompleta = {
        factura: { ...registro.factura, idFactura },
        detalles: registro.detalles.map((d) => ({ ...d, idFactura, idFacturaDetalle: this.nextDetalleId++ })),
      };
      this.registros.update((list) => [...list, nueva]);
      return idFactura;
    }

    this.registros.update((list) =>
      list.map((r) => (r.factura.idFactura === registro.factura.idFactura ? registro : r)),
    );
    return registro.factura.idFactura;
  }

  registrarPago(pago: Omit<import('../models').Pago, 'idPago' | 'activo'>): void {
    const idPago = this.pagos().length
      ? Math.max(...this.pagos().map((p) => p.idPago)) + 1
      : 1;
    this.pagos.update((list) => [...list, { ...pago, idPago, activo: true }]);

    // Si el pago cubre el total de la factura, se marca como pagada.
    // (this.pagos ya incluye el pago recién agregado en este punto.)
    const factura = this.obtener(pago.idFactura);
    if (factura && this.totalPagado(pago.idFactura) >= factura.factura.total) {
      this.registros.update((list) =>
        list.map((r) =>
          r.factura.idFactura === pago.idFactura ? { ...r, factura: { ...r.factura, idEstadoFactura: 2 } } : r,
        ),
      );
    }
  }

  eliminar(id: number): void {
    this.registros.update((list) =>
      list.map((r) => (r.factura.idFactura === id ? { ...r, factura: { ...r.factura, activo: false } } : r)),
    );
  }
}
