import { Component, Pipe, PipeTransform, afterNextRender, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { provideNativeDateAdapter } from '@angular/material/core';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { ReportesService } from '../../service/reportes.service';
import { IndicadorClinico, IndicadorFinanciero } from '../../models/reporte.model';

// Paleta categórica validada (ver dataviz skill / palette.md): orden fijo,
// nunca se reparte al azar — el mismo código de estado siempre cae en el
// mismo color mientras esté en esta lista. { claro, oscuro }.
const PALETA: { claro: string; oscuro: string }[] = [
  { claro: '#2a78d6', oscuro: '#3987e5' }, // azul
  { claro: '#eb6834', oscuro: '#d95926' }, // naranja
  { claro: '#1baf7a', oscuro: '#199e70' }, // aqua
  { claro: '#eda100', oscuro: '#c98500' }, // amarillo
  { claro: '#e87ba4', oscuro: '#d55181' }, // magenta
  { claro: '#008300', oscuro: '#008300' }, // verde
  { claro: '#6250d6', oscuro: '#9085e9' }, // violeta
  { claro: '#e34948', oscuro: '#e66767' }, // rojo
];

// Orden de negocio preferido por indicador (ciclo de vida de la cita / de la
// factura); cualquier código que no esté acá cae al final, en orden de
// aparición, para no dejar fuera un estado nuevo que agregue el backend.
const ORDEN_ESTADO_CITA = ['PROGRAMADA', 'CONFIRMADA', 'EN_ATENCION', 'ATENDIDA', 'CANCELADA'];
const ORDEN_ESTADO_FACTURA = ['EMITIDA', 'PENDIENTE', 'PAGADA', 'ANULADA'];

interface Segmento {
  codigo: string;
  valor: number;
  color: string;
  colorOscuro: string;
}

interface BarraMes {
  mes: string; // "2026-10-01"
  etiqueta: string; // "oct 2026"
  total: number;
  segmentos: Segmento[];
}

// Geometría ya resuelta en "unidades SVG" (no px de pantalla — el <svg> es
// responsive vía viewBox): x/ancho de la columna completa, y/alto de cada
// segmento apilado, creciendo desde la base hacia arriba con un hueco de 2
// unidades entre segmentos (ver dataviz: "surface gap").
interface SegmentoSvg extends Segmento {
  y: number;
  alto: number;
  esTope: boolean;
}

interface BarraSvg extends BarraMes {
  x: number;
  ancho: number;
  segmentosSvg: SegmentoSvg[];
}

const ALTO_GRAFICO = 180; // unidades SVG disponibles para las barras
const ANCHO_BARRA = 28;
const ANCHO_SLOT = 52; // ANCHO_BARRA + espacio entre columnas
const HUECO_SEGMENTO = 2;

function escalarBarras(barras: BarraMes[], techo: number): BarraSvg[] {
  return barras.map((barra, i) => {
    let acumulado = 0;
    const segmentosSvg: SegmentoSvg[] = barra.segmentos.map((s, idx) => {
      const altoBruto = techo > 0 ? (s.valor / techo) * ALTO_GRAFICO : 0;
      const alto = Math.max(0, altoBruto - HUECO_SEGMENTO);
      const y = ALTO_GRAFICO - acumulado - altoBruto;
      acumulado += altoBruto;
      return { ...s, y, alto, esTope: idx === barra.segmentos.length - 1 };
    });
    return {
      ...barra,
      x: i * ANCHO_SLOT,
      ancho: ANCHO_BARRA,
      segmentosSvg,
    };
  });
}

interface SerieEstado {
  codigo: string;
  color: string;
  colorOscuro: string;
}

function formatMes(iso: string): string {
  const fecha = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  if (isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleDateString('es-GT', { month: 'short', year: 'numeric' }).replace('.', '');
}

// Humaniza un código de catálogo (PROGRAMADA -> Programada, EN_ATENCION ->
// En atención) sin depender de que el backend mande el nombre bonito —
// mantiene el gráfico usable aunque solo venga el código.
function formatCodigo(codigo: string): string {
  return codigo
    .toLowerCase()
    .split('_')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

function construirSeries(codigos: string[], ordenPreferido: string[]): SerieEstado[] {
  const unicos = [...new Set(codigos)];
  unicos.sort((a, b) => {
    const ia = ordenPreferido.indexOf(a);
    const ib = ordenPreferido.indexOf(b);
    if (ia === -1 && ib === -1) return 0;
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return unicos.map((codigo, i) => {
    const color = PALETA[i % PALETA.length];
    return { codigo, color: color.claro, colorOscuro: color.oscuro };
  });
}

function construirBarras<T>(
  items: T[],
  getMes: (t: T) => string,
  getEstado: (t: T) => string,
  getValor: (t: T) => number,
  series: SerieEstado[],
): BarraMes[] {
  const porMes = new Map<string, Map<string, number>>();
  for (const item of items) {
    const mes = getMes(item);
    const estado = getEstado(item);
    const valor = getValor(item);
    if (!porMes.has(mes)) porMes.set(mes, new Map());
    const fila = porMes.get(mes)!;
    fila.set(estado, (fila.get(estado) ?? 0) + valor);
  }

  const meses = [...porMes.keys()].sort();
  return meses.map((mes) => {
    const fila = porMes.get(mes)!;
    const segmentos: Segmento[] = series
      .map((s) => ({ codigo: s.codigo, valor: fila.get(s.codigo) ?? 0, color: s.color, colorOscuro: s.colorOscuro }))
      .filter((s) => s.valor > 0);
    const total = segmentos.reduce((sum, s) => sum + s.valor, 0);
    return { mes, etiqueta: formatMes(mes), total, segmentos };
  });
}

// Redondea el techo del eje Y a un número "limpio" (10, 20, 50, 100, 200...)
// para que las líneas guía no queden en valores raros como 137.
function techoLimpio(valorMaximo: number): number {
  if (valorMaximo <= 0) return 10;
  const magnitud = Math.pow(10, Math.floor(Math.log10(valorMaximo)));
  const pasos = [1, 2, 5, 10];
  for (const paso of pasos) {
    const techo = paso * magnitud;
    if (techo >= valorMaximo) return techo;
  }
  return 10 * magnitud;
}

// Busca el valor de un segmento por código dentro de la tabla de detalle
// (vista alterna del gráfico, para accesibilidad): el for-loop de columnas
// recorre las series en orden fijo, no los segmentos reales de esa fila
// (una fila puede no tener todos los estados).
@Pipe({ name: 'find', standalone: true })
export class FindSegmentoPipe implements PipeTransform {
  transform(segmentos: Segmento[], codigo: string): number | null {
    return segmentos.find((s) => s.codigo === codigo)?.valor ?? null;
  }
}

@Component({
  selector: 'app-reportes-lista',
  imports: [
    FormsModule,
    DecimalPipe,
    FindSegmentoPipe,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './reportes-lista.html',
  styleUrl: './reportes-lista.css',
})
export class ReportesLista {
  private reportesService = inject(ReportesService);

  // Por default, los últimos 6 meses — evita pedir todo el histórico y hace
  // que el gráfico arranque legible.
  desde = signal<Date | null>(this.hace(6));
  hasta = signal<Date | null>(new Date());

  cargando = signal(false);
  // null = sin error; string = mensaje. Se distingue "el backend todavía no
  // expone este endpoint" (404 / sin ruta) de "sí respondió, pero no hay
  // datos en este rango" (lista vacía con éxito), para no confundir al
  // usuario con el estado equivocado.
  errorClinicos = signal<string | null>(null);
  errorFinancieros = signal<string | null>(null);

  private clinicosRaw = signal<IndicadorClinico[]>([]);
  private financierosRaw = signal<IndicadorFinanciero[]>([]);

  mostrarTablaClinicos = signal(false);
  mostrarTablaFinancieros = signal(false);

  seriesClinicas = computed(() =>
    construirSeries(this.clinicosRaw().map((i) => i.estadoCita), ORDEN_ESTADO_CITA),
  );
  seriesFinancieras = computed(() =>
    construirSeries(this.financierosRaw().map((i) => i.estadoFactura), ORDEN_ESTADO_FACTURA),
  );

  barrasClinicas = computed(() =>
    construirBarras(this.clinicosRaw(), (i) => i.mes, (i) => i.estadoCita, (i) => i.totalCitas, this.seriesClinicas()),
  );
  barrasFinancieras = computed(() =>
    construirBarras(
      this.financierosRaw(),
      (i) => i.mes,
      (i) => i.estadoFactura,
      (i) => i.montoTotal,
      this.seriesFinancieras(),
    ),
  );

  techoClinicos = computed(() => techoLimpio(Math.max(0, ...this.barrasClinicas().map((b) => b.total))));
  techoFinancieros = computed(() => techoLimpio(Math.max(0, ...this.barrasFinancieras().map((b) => b.total))));

  svgClinicos = computed(() => escalarBarras(this.barrasClinicas(), this.techoClinicos()));
  svgFinancieros = computed(() => escalarBarras(this.barrasFinancieras(), this.techoFinancieros()));

  readonly altoGrafico = ALTO_GRAFICO;
  readonly anchoSlot = ANCHO_SLOT;
  readonly anchoBarra = ANCHO_BARRA;

  viewBoxClinicos = computed(() => `0 0 ${Math.max(1, this.svgClinicos().length) * ANCHO_SLOT} ${ALTO_GRAFICO + 24}`);
  viewBoxFinancieros = computed(
    () => `0 0 ${Math.max(1, this.svgFinancieros().length) * ANCHO_SLOT} ${ALTO_GRAFICO + 24}`,
  );

  totalCitas = computed(() => this.clinicosRaw().reduce((sum, i) => sum + i.totalCitas, 0));
  totalFacturado = computed(() => this.financierosRaw().reduce((sum, i) => sum + i.montoTotal, 0));
  totalFacturas = computed(() => this.financierosRaw().reduce((sum, i) => sum + i.cantidadFacturas, 0));
  ticketPromedio = computed(() => {
    const facturas = this.totalFacturas();
    return facturas > 0 ? this.totalFacturado() / facturas : 0;
  });

  constructor() {
    afterNextRender(() => this.buscar());
  }

  private hace(meses: number): Date {
    const d = new Date();
    d.setMonth(d.getMonth() - meses);
    d.setDate(1);
    return d;
  }

  private isoFecha(d: Date | null): string | null {
    if (!d) return null;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  }

  buscar(): void {
    this.cargando.set(true);
    this.errorClinicos.set(null);
    this.errorFinancieros.set(null);
    const desde = this.isoFecha(this.desde());
    const hasta = this.isoFecha(this.hasta());

    forkJoin({
      clinicos: this.reportesService.indicadoresClinicos(desde, hasta),
      financieros: this.reportesService.indicadoresFinancieros(desde, hasta),
    }).subscribe({
      next: ({ clinicos, financieros }) => {
        this.clinicosRaw.set(clinicos);
        this.financierosRaw.set(financieros);
        this.cargando.set(false);
      },
      error: () => {
        // Un solo forkJoin no deja distinguir cuál de los dos falló si ambos
        // fallan igual; se reintenta cada uno por separado para dar el
        // mensaje correcto a cada gráfico en vez de tumbar toda la pantalla.
        this.cargarPorSeparado(desde, hasta);
      },
    });
  }

  private cargarPorSeparado(desde: string | null, hasta: string | null): void {
    this.reportesService.indicadoresClinicos(desde, hasta).subscribe({
      next: (datos) => this.clinicosRaw.set(datos),
      error: (err: HttpErrorResponse) => {
        this.clinicosRaw.set([]);
        this.errorClinicos.set(this.mensajeError(err));
      },
    });
    this.reportesService.indicadoresFinancieros(desde, hasta).subscribe({
      next: (datos) => this.financierosRaw.set(datos),
      error: (err: HttpErrorResponse) => {
        this.financierosRaw.set([]);
        this.errorFinancieros.set(this.mensajeError(err));
      },
      complete: () => this.cargando.set(false),
    });
    // Por si el segundo observable nunca completa un "complete" (p. ej. si
    // también entra por error sin complete en algún interceptor): asegura
    // que cargando no se quede pegado en true.
    this.cargando.set(false);
  }

  private mensajeError(err: HttpErrorResponse): string {
    if (err.status === 404) {
      return 'El backend todavía no expone este reporte (endpoint pendiente — ver SOLICITUD_REPORTERIA_Y_MODULO_CATALOGOS.md).';
    }
    return 'No se pudo cargar este reporte.';
  }

  limpiarFiltro(): void {
    this.desde.set(this.hace(6));
    this.hasta.set(new Date());
    this.buscar();
  }

  formatQ(valor: number): string {
    return `Q${valor.toLocaleString('es-GT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  formatCompacto(valor: number): string {
    if (valor >= 1_000_000) return `${(valor / 1_000_000).toFixed(1)}M`;
    if (valor >= 1_000) return `${(valor / 1_000).toFixed(1)}K`;
    return String(Math.round(valor));
  }

  etiquetaEstado(codigo: string): string {
    return formatCodigo(codigo);
  }

  // Marcas limpias del eje Y: 0, 1/4, 1/2, 3/4 y el techo.
  marcasEje(techo: number): number[] {
    return [0, techo * 0.25, techo * 0.5, techo * 0.75, techo];
  }

  yEje(valor: number, techo: number): number {
    return techo > 0 ? ALTO_GRAFICO - (valor / techo) * ALTO_GRAFICO : ALTO_GRAFICO;
  }
}
