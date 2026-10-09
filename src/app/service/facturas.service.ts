import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { Factura, FacturaDetalle, Pago } from '../models';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';
import { CatalogosService } from './catalogos.service';
import { ESTADOS_PAGO } from '../facturacion/facturacion-catalogos';

// Igual que FacturaCompletaDto del backend: { factura, detalles }.
export interface FacturaCompleta {
  factura: Factura;
  detalles: FacturaDetalle[];
}

// FacturaInputDto. El número de documento, subtotal, impuesto (IVA 12%) y
// total los calcula el backend; el cliente no los envía. En los detalles,
// idFacturaDetalle = 0 significa "nuevo" y al editar los que no vengan se
// dan de baja, así que siempre va la lista completa.
export interface FacturaInput {
  idPaciente: number;
  idTipoDocumentoFiscal: number;
  serie: string | null;
  fechaEmision: string;
  descuento: number;
  idEstadoFactura: number;
  numeroAutorizacionFel: string | null;
  fechaCertificacionFel: string | null;
  idConvenio: number | null;
  idPoliza: number | null;
  detalles: {
    idFacturaDetalle: number;
    idTipoItem: number;
    idCita: number | null;
    idTratamiento: number | null;
    idMedicamento: number | null;
    descripcion: string;
    cantidad: number;
    precioUnitario: number;
    descuento: number;
  }[];
}

// RegistrarPagoDto
export interface RegistrarPago {
  idFormaPago: number;
  idEstadoPago: number;
  monto: number;
  referenciaPago: string | null;
  observaciones: string | null;
}

// Código real que usa el backend para el estado de pago que cuenta para el
// total cobrado (Servicios/FacturasService.cs: ESTADO_PAGO/"APLICADO"). Si el
// catálogo aún no cargó se usa 1 como último recurso.
const ESTADO_PAGO_APLICADO_CODIGO = 'APLICADO';
const ESTADO_PAGO_APLICADO_FALLBACK = 1;

@Injectable({ providedIn: 'root' })
export class FacturasService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private catalogos = inject(CatalogosService);
  private apiUrl = 'https://localhost:7086/api/facturas';

  private registros = signal<FacturaCompleta[]>([]);
  // El backend no tiene un listado global de pagos: se arma juntando los de
  // cada factura (GET /api/facturas/{id}/pagos).
  private pagos = signal<Pago[]>([]);
  cargando = signal(false);
  errorCarga = signal('');

  listar = computed(() =>
    [...this.registros()].sort((a, b) => b.factura.fechaEmision.localeCompare(a.factura.fechaEmision)),
  );

  listarPagos = computed(() =>
    [...this.pagos()].sort((a, b) => b.fechaPago.localeCompare(a.fechaPago)),
  );

  // GET /api/facturas solo trae las activas; las dadas de baja se piden
  // aparte en /eliminadas.
  private eliminadas = signal<FacturaCompleta[]>([]);
  cargandoEliminadas = signal(false);
  errorEliminadas = signal('');

  listarEliminadas = computed(() =>
    [...this.eliminadas()].sort((a, b) => b.factura.fechaEmision.localeCompare(a.factura.fechaEmision)),
  );

  cargarEliminadas(): void {
    this.cargandoEliminadas.set(true);
    this.errorEliminadas.set('');
    this.http
      .get<ApiResponse<FacturaCompleta[]>>(`${this.apiUrl}/eliminadas`)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.eliminadas.set(lista);
          this.cargandoEliminadas.set(false);
        },
        error: () => {
          this.errorEliminadas.set('No se pudieron cargar las facturas eliminadas.');
          this.cargandoEliminadas.set(false);
        },
      });
  }

  // El backend solo confirma el reactivado (no devuelve la factura
  // completa), así que para verla en la lista de activas hay que recargarla.
  reactivar(id: number): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.apiUrl}/${id}/reactivar`, {}).pipe(
      map(() => undefined),
      tap(() => {
        this.eliminadas.update((lista) => lista.filter((x) => x.factura.idFactura !== id));
        this.cargar();
      }),
      catchError(this.errorService.handleError),
    );
  }

  obtener(id: number): FacturaCompleta | undefined {
    return this.registros().find((r) => r.factura.idFactura === id);
  }

  pagosDe(idFactura: number): Pago[] {
    return this.listarPagos().filter((p) => p.idFactura === idFactura);
  }

  // Id real del estado de pago "Aplicado" (el que cuenta como cobrado).
  idEstadoPagoAplicado(): number {
    return (
      this.catalogos.idPorCodigo('ESTADO_PAGO', ESTADO_PAGO_APLICADO_CODIGO) ?? ESTADO_PAGO_APLICADO_FALLBACK
    );
  }

  // Para mostrar el estado del pago (Aplicado/Anulado) en las listas; antes
  // no se mostraba en ningún lado. Catálogo real si existe, si no, la lista
  // de ejemplo.
  estadoPagoLabel(idEstadoPago: number): string {
    const api = this.catalogos.obtener('ESTADO_PAGO')();
    const lista = api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : ESTADOS_PAGO;
    return lista.find((e) => e.id === idEstadoPago)?.label ?? '—';
  }

  totalPagado(idFactura: number): number {
    const idAplicado = this.idEstadoPagoAplicado();
    return this.pagos()
      .filter((p) => p.idFactura === idFactura && p.idEstadoPago === idAplicado)
      .reduce((suma, p) => suma + p.monto, 0);
  }

  // Trae facturas y, con ellas, los pagos de cada una.
  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.http
      .get<ApiResponse<FacturaCompleta[]>>(this.apiUrl)
      .pipe(
        map((resp) => resp.datos ?? []),
        tap((facturas) => this.registros.set(facturas)),
        switchMap((facturas) =>
          facturas.length
            ? forkJoin(facturas.map((f) => this.pedirPagos(f.factura.idFactura)))
            : of([] as Pago[][]),
        ),
        catchError(this.errorService.handleError),
      )
      .subscribe({
        next: (porFactura) => {
          this.pagos.set(porFactura.flat());
          this.cargando.set(false);
        },
        error: (err: Error) => {
          this.errorCarga.set(err.message);
          this.cargando.set(false);
        },
      });
  }

  // Para abrir una factura directo por URL (recarga de página): la trae
  // junto con sus pagos y las deja en la caché.
  obtenerPorId(id: number): Observable<FacturaCompleta> {
    return this.http.get<ApiResponse<FacturaCompleta>>(`${this.apiUrl}/${id}`).pipe(
      map((resp) => resp.datos as FacturaCompleta),
      tap((factura) => this.guardarEnCache(factura)),
      switchMap((factura) =>
        this.pedirPagos(id).pipe(
          tap((pagos) => this.reemplazarPagosDe(id, pagos)),
          map(() => factura),
        ),
      ),
      catchError(this.errorService.handleError),
    );
  }

  crear(factura: FacturaInput): Observable<FacturaCompleta> {
    return this.http.post<ApiResponse<FacturaCompleta>>(this.apiUrl, factura).pipe(
      map((resp) => resp.datos as FacturaCompleta),
      tap((nueva) => this.guardarEnCache(nueva)),
      catchError(this.errorService.handleError),
    );
  }

  actualizar(id: number, factura: FacturaInput): Observable<FacturaCompleta> {
    return this.http.put<ApiResponse<FacturaCompleta>>(`${this.apiUrl}/${id}`, factura).pipe(
      map((resp) => resp.datos as FacturaCompleta),
      tap((editada) => this.guardarEnCache(editada)),
      catchError(this.errorService.handleError),
    );
  }

  // Borrado lógico en el backend (activo = false).
  eliminar(id: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.registros.update((lista) => lista.filter((r) => r.factura.idFactura !== id))),
      catchError(this.errorService.handleError),
    );
  }

  // Registra el pago y vuelve a pedir la factura: el backend la pasa a
  // "pagada" cuando los pagos aprobados cubren el total.
  registrarPago(idFactura: number, pago: RegistrarPago): Observable<Pago> {
    return this.http.post<ApiResponse<Pago>>(`${this.apiUrl}/${idFactura}/pagos`, pago).pipe(
      map((resp) => resp.datos as Pago),
      tap((nuevo) => this.pagos.update((lista) => [...lista, nuevo])),
      switchMap((nuevo) =>
        this.http.get<ApiResponse<FacturaCompleta>>(`${this.apiUrl}/${idFactura}`).pipe(
          tap((resp) => resp.datos && this.guardarEnCache(resp.datos)),
          map(() => nuevo),
        ),
      ),
      catchError(this.errorService.handleError),
    );
  }

  private pedirPagos(idFactura: number): Observable<Pago[]> {
    return this.http
      .get<ApiResponse<Pago[]>>(`${this.apiUrl}/${idFactura}/pagos`)
      .pipe(map((resp) => resp.datos ?? []));
  }

  private reemplazarPagosDe(idFactura: number, pagos: Pago[]): void {
    this.pagos.update((lista) => [...lista.filter((p) => p.idFactura !== idFactura), ...pagos]);
  }

  private guardarEnCache(factura: FacturaCompleta): void {
    this.registros.update((lista) => {
      const existe = lista.some((r) => r.factura.idFactura === factura.factura.idFactura);
      return existe
        ? lista.map((r) => (r.factura.idFactura === factura.factura.idFactura ? factura : r))
        : [...lista, factura];
    });
  }
}
