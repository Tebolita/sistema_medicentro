import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, tap } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

// ConvenioDto / ConvenioInputDto reales (ConveniosController: CRUD completo).
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

@Injectable({ providedIn: 'root' })
export class ConveniosService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private apiUrl = 'https://localhost:7086/api/convenios';

  private registros = signal<Convenio[]>([]);
  cargando = signal(false);
  errorCarga = signal('');

  // Solo los activos, igual que el resto de selectores del sistema.
  listar = computed(() =>
    [...this.registros()].filter((c) => c.activo).sort((a, b) => a.nombreConvenio.localeCompare(b.nombreConvenio)),
  );
  // Para la pantalla de mantenimiento, que también necesita ver los dados de baja.
  listarTodos = computed(() => [...this.registros()].sort((a, b) => a.nombreConvenio.localeCompare(b.nombreConvenio)));

  constructor() {
    if (this.esNavegador) {
      this.cargar();
    }
  }

  obtener(id: number): Convenio | undefined {
    return this.registros().find((c) => c.idConvenio === id);
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.http.get<ApiResponse<Convenio[]>>(this.apiUrl).subscribe({
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
    return this.http.get<ApiResponse<Convenio>>(`${this.apiUrl}/${id}`).pipe(
      map((resp) => resp.datos as Convenio),
      tap((c) => this.guardarEnCache(c)),
      catchError(this.errorService.handleError),
    );
  }

  crear(input: ConvenioInput): Observable<Convenio> {
    return this.http.post<ApiResponse<Convenio>>(this.apiUrl, input).pipe(
      map((resp) => resp.datos as Convenio),
      tap((c) => this.guardarEnCache(c)),
      catchError(this.errorService.handleError),
    );
  }

  actualizar(id: number, input: ConvenioInput): Observable<Convenio> {
    return this.http.put<ApiResponse<Convenio>>(`${this.apiUrl}/${id}`, input).pipe(
      map((resp) => resp.datos as Convenio),
      tap((c) => this.guardarEnCache(c)),
      catchError(this.errorService.handleError),
    );
  }

  // Borrado lógico (activo = false).
  eliminar(id: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${id}`).pipe(
      tap(() =>
        this.registros.update((lista) =>
          lista.map((c) => (c.idConvenio === id ? { ...c, activo: false } : c)),
        ),
      ),
      catchError(this.errorService.handleError),
    );
  }

  private guardarEnCache(c: Convenio): void {
    this.registros.update((lista) =>
      lista.some((x) => x.idConvenio === c.idConvenio)
        ? lista.map((x) => (x.idConvenio === c.idConvenio ? c : x))
        : [...lista, c],
    );
  }
}
