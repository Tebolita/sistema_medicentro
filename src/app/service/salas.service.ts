import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, tap } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

// SalaDto / SalaInputDto reales (SalasController: CRUD completo).
// idTipoSala/idEstadoSala no se validan contra nada del lado del backend.
export interface Sala {
  idSala: number;
  nombre: string;
  idTipoSala: number | null;
  idEstadoSala: number;
  capacidad: number;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface SalaInput {
  nombre: string;
  idTipoSala: number | null;
  idEstadoSala: number;
  capacidad: number;
}

@Injectable({ providedIn: 'root' })
export class SalasService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private apiUrl = 'https://localhost:7086/api/salas';

  private registros = signal<Sala[]>([]);
  cargando = signal(false);
  errorCarga = signal('');

  listar = computed(() => [...this.registros()].filter((s) => s.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)));

  // GET /api/salas solo trae las activas; las dadas de baja se piden
  // aparte en /eliminadas.
  private eliminadas = signal<Sala[]>([]);
  cargandoEliminadas = signal(false);
  errorEliminadas = signal('');

  listarEliminadas = computed(() => [...this.eliminadas()].sort((a, b) => a.nombre.localeCompare(b.nombre)));

  constructor() {
    if (this.esNavegador) {
      this.cargar();
    }
  }

  obtener(id: number): Sala | undefined {
    return this.registros().find((s) => s.idSala === id);
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.http
      .get<ApiResponse<Sala[]>>(this.apiUrl)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.registros.set(lista);
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set('No se pudo cargar el listado de salas.');
          this.cargando.set(false);
        },
      });
  }

  cargarEliminadas(): void {
    this.cargandoEliminadas.set(true);
    this.errorEliminadas.set('');
    this.http
      .get<ApiResponse<Sala[]>>(`${this.apiUrl}/eliminadas`)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.eliminadas.set(lista);
          this.cargandoEliminadas.set(false);
        },
        error: () => {
          this.errorEliminadas.set('No se pudieron cargar las salas eliminadas.');
          this.cargandoEliminadas.set(false);
        },
      });
  }

  obtenerPorId(id: number): Observable<Sala> {
    return this.http.get<ApiResponse<Sala>>(`${this.apiUrl}/${id}`).pipe(
      map((resp) => resp.datos as Sala),
      tap((s) => this.guardarEnCache(s)),
      catchError(this.errorService.handleError),
    );
  }

  crear(input: SalaInput): Observable<Sala> {
    return this.http.post<ApiResponse<Sala>>(this.apiUrl, input).pipe(
      map((resp) => resp.datos as Sala),
      tap((s) => this.guardarEnCache(s)),
      catchError(this.errorService.handleError),
    );
  }

  actualizar(id: number, input: SalaInput): Observable<Sala> {
    return this.http.put<ApiResponse<Sala>>(`${this.apiUrl}/${id}`, input).pipe(
      map((resp) => resp.datos as Sala),
      tap((s) => this.guardarEnCache(s)),
      catchError(this.errorService.handleError),
    );
  }

  // Borrado lógico (activo = false).
  eliminar(id: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.registros.update((lista) => lista.filter((s) => s.idSala !== id))),
      catchError(this.errorService.handleError),
    );
  }

  // El backend solo confirma el reactivado (no devuelve la sala completa),
  // así que para verla en la lista de activas hay que recargarla.
  reactivar(id: number): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.apiUrl}/${id}/reactivar`, {}).pipe(
      map(() => undefined),
      tap(() => {
        this.eliminadas.update((lista) => lista.filter((x) => x.idSala !== id));
        this.cargar();
      }),
      catchError(this.errorService.handleError),
    );
  }

  private guardarEnCache(s: Sala): void {
    this.registros.update((lista) =>
      lista.some((x) => x.idSala === s.idSala) ? lista.map((x) => (x.idSala === s.idSala ? s : x)) : [...lista, s],
    );
  }
}
