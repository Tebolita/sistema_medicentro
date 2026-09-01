// Módulo 9: Reportes y Estadísticas.
// Los indicadores se calculan sobre las tablas operativas (no se duplican
// datos); las dos vistas de abajo son de solo lectura.

export interface ReporteGenerado {
  idReporteGenerado: number;
  idTipoReporte: number; // cat TIPO_REPORTE
  parametros: string | null; // JSON string
  fechaGeneracion: string;
  idUsuario: number | null;
  urlArchivo: string | null;
  activo: boolean;
}

// Vista vw_indicadores_clinicos (solo lectura)
export interface IndicadorClinico {
  mes: string; // primer día del mes (DATEFROMPARTS)
  estadoCita: string; // código de cat ESTADO_CITA
  totalCitas: number;
}

// Vista vw_indicadores_financieros (solo lectura)
export interface IndicadorFinanciero {
  mes: string; // primer día del mes (DATEFROMPARTS)
  estadoFactura: string; // código de cat ESTADO_FACTURA
  montoTotal: number;
  cantidadFacturas: number;
}
