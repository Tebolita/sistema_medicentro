import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, tap } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

// ConvenioDto real (ConveniosController: CRUD completo).
export interface Convenio {
  idConvenio: number;
  idAseguradora: number;
  nombreConvenio: string;
  fechaInicio: string;
  fechaFin: string | null;
  porcentajeCoberturaGeneral: number | null;
  condiciones: string | null;
  idEstadoConvenio: number;
  activo: boolean;
}

export interface ConvenioInput {
  idAseguradora: number;
  nombreConvenio: string;
  fechaInicio: string;
  fechaFin: string | null;
  porcentajeCoberturaGeneral: number | null;
  condiciones: string | null;
  idEstadoConvenio: number;
}

// AfiliadoDto/CoberturaDto: el backend los trae anidados junto al convenio
// (ver ConvenioCompleto abajo), pero el frontend todavía no tiene pantalla
// para administrarlos — se guardan tipados por si se necesitan después.
export interface Afiliado {
  idPacienteConvenio: number;
  idPaciente: number;
  idConvenio: number;
  numeroAfiliado: string | null;
  fechaVinculacion: string;
  idEstadoAfiliacion: number;
  activo: boolean;
}

export interface Cobertura {
  idConvenioCobertura: number;
  idConvenio: number;
  idTipoItem: number;
  porcentajeCobertura: number;
  montoMaximo: number | null;
  activo: boolean;
}

// ConvenioCompletoDto real: el backend SIEMPRE devuelve el convenio envuelto
// junto con sus afiliados y coberturas (mismo patrón que FacturaCompleta
// {factura, detalles} o HabitacionCompleta {habitacion, camas}) — nunca un
// Convenio plano suelto. Esto se desempaqueta adentro del servicio para que
// el resto de la app siga trabajando con el Convenio plano de siempre.
interface ConvenioCompleto {
  convenio: Convenio;
  afiliados: Afiliado[];
  coberturas: Cobertura[];
}

@Injectable({ providedIn: 'root' })
export class ConveniosService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private apiUrl = 'https://localhost:7086/api/convenios';

  // GET /api/convenios solo trae los activos (lo que hace falta para
  // "Eliminados" es lo mismo que en el resto de entidades: GET /eliminadas
  // + PUT /{id}/reactivar — todavía no construido en esta pantalla).
  private registros = signal<ConvenioCompleto[]>([]);
  cargando = signal(false);
  errorCarga = signal('');

  listar = computed(() =>
    [...this.registros()]
      .map((r) => r.convenio)
      .filter((c) => c.activo)
      .sort((a, b) => a.nombreConvenio.localeCompare(b.nombreConvenio)),
  );
  // "Todos" hoy es igual a "activos" (ver comentario arriba): GET /api/convenios
  // nunca trae los dados de baja, así que no hay nada más que mostrarle.
  listarTodos = computed(() =>
    [...this.registros()].map((r) => r.convenio).sort((a, b) => a.nombreConvenio.localeCompare(b.nombreConvenio)),
  );

  constructor() {
    if (this.esNavegador) {
      this.cargar();
    }
  }

  obtener(id: number): Convenio | undefined {
    return this.registros().find((r) => r.convenio.idConvenio === id)?.convenio;
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.http.get<ApiResponse<ConvenioCompleto[]>>(this.apiUrl).subscribe({
      next: (resp) => {
        this.registros.set(resp.datos ?? []);
        this.cargando.set(false);
      },
      error: () => {
        this.errorCarga.set('No se pudo cargar el listado de convenios.');
        this.cargando.set(false);
      },
    });
  }

  obtenerPorId(id: number): Observable<Convenio> {
    return this.http.get<ApiResponse<ConvenioCompleto>>(`${this.apiUrl}/${id}`).pipe(
      map((resp) => resp.datos as ConvenioCompleto),
      tap((r) => this.guardarEnCache(r)),
      map((r) => r.convenio),
      catchError(this.errorService.handleError),
    );
  }

  crear(input: ConvenioInput): Observable<Convenio> {
    return this.http.post<ApiResponse<ConvenioCompleto>>(this.apiUrl, input).pipe(
      map((resp) => resp.datos as ConvenioCompleto),
      tap((r) => this.guardarEnCache(r)),
      map((r) => r.convenio),
      catchError(this.errorService.handleError),
    );
  }

  actualizar(id: number, input: ConvenioInput): Observable<Convenio> {
    return this.http.put<ApiResponse<ConvenioCompleto>>(`${this.apiUrl}/${id}`, input).pipe(
      map((resp) => resp.datos as ConvenioCompleto),
      tap((r) => this.guardarEnCache(r)),
      map((r) => r.convenio),
      catchError(this.errorService.handleError),
    );
  }

  // Borrado lógico (activo = false).
  eliminar(id: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${id}`).pipe(
      tap(() =>
        this.registros.update((lista) =>
          lista.map((r) => (r.convenio.idConvenio === id ? { ...r, convenio: { ...r.convenio, activo: false } } : r)),
        ),
      ),
      catchError(this.errorService.handleError),
    );
  }

  private guardarEnCache(r: ConvenioCompleto): void {
    this.registros.update((lista) =>
      lista.some((x) => x.convenio.idConvenio === r.convenio.idConvenio)
        ? lista.map((x) => (x.convenio.idConvenio === r.convenio.idConvenio ? r : x))
        : [...lista, r],
    );
  }
}
