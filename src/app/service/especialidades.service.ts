import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, tap } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

// EspecialidadDto / EspecialidadInputDto reales (RecursosHumanosController: CRUD completo).
export interface Especialidad {
  idEspecialidad: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface EspecialidadInput {
  nombre: string;
  descripcion: string | null;
}

@Injectable({ providedIn: 'root' })
export class EspecialidadesService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private apiUrl = 'https://localhost:7086/api/especialidades';

  private registros = signal<Especialidad[]>([]);
  cargando = signal(false);
  errorCarga = signal('');

  listar = computed(() =>
    [...this.registros()].filter((e) => e.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)),
  );

  // GET /api/especialidades solo trae las activas; las dadas de baja se
  // piden aparte en /eliminadas.
  private eliminadas = signal<Especialidad[]>([]);
  cargandoEliminadas = signal(false);
  errorEliminadas = signal('');

  listarEliminadas = computed(() => [...this.eliminadas()].sort((a, b) => a.nombre.localeCompare(b.nombre)));

  constructor() {
    if (this.esNavegador) {
      this.cargar();
    }
  }

  obtener(id: number): Especialidad | undefined {
    return this.registros().find((e) => e.idEspecialidad === id);
  }

  nombreDe(id: number): string | undefined {
    return this.obtener(id)?.nombre;
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.http
      .get<ApiResponse<Especialidad[]>>(this.apiUrl)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.registros.set(lista);
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set('No se pudo cargar el listado de especialidades.');
          this.cargando.set(false);
        },
      });
  }

  cargarEliminadas(): void {
    this.cargandoEliminadas.set(true);
    this.errorEliminadas.set('');
    this.http
      .get<ApiResponse<Especialidad[]>>(`${this.apiUrl}/eliminadas`)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.eliminadas.set(lista);
          this.cargandoEliminadas.set(false);
        },
        error: () => {
          this.errorEliminadas.set('No se pudieron cargar las especialidades eliminadas.');
          this.cargandoEliminadas.set(false);
        },
      });
  }

  obtenerPorId(id: number): Observable<Especialidad> {
    return this.http.get<ApiResponse<Especialidad>>(`${this.apiUrl}/${id}`).pipe(
      map((resp) => resp.datos as Especialidad),
      tap((e) => this.guardarEnCache(e)),
      catchError(this.errorService.handleError),
    );
  }

  crear(input: EspecialidadInput): Observable<Especialidad> {
    return this.http.post<ApiResponse<Especialidad>>(this.apiUrl, input).pipe(
      map((resp) => resp.datos as Especialidad),
      tap((e) => this.guardarEnCache(e)),
      catchError(this.errorService.handleError),
    );
  }

  actualizar(id: number, input: EspecialidadInput): Observable<Especialidad> {
    return this.http.put<ApiResponse<Especialidad>>(`${this.apiUrl}/${id}`, input).pipe(
      map((resp) => resp.datos as Especialidad),
      tap((e) => this.guardarEnCache(e)),
      catchError(this.errorService.handleError),
    );
  }

  // Borrado lógico (activo = false).
  eliminar(id: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.registros.update((lista) => lista.filter((e) => e.idEspecialidad !== id))),
      catchError(this.errorService.handleError),
    );
  }

  // El backend solo confirma el reactivado (no devuelve la especialidad
  // completa), así que para verla en la lista de activas hay que recargarla.
  reactivar(id: number): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.apiUrl}/${id}/reactivar`, {}).pipe(
      map(() => undefined),
      tap(() => {
        this.eliminadas.update((lista) => lista.filter((x) => x.idEspecialidad !== id));
        this.cargar();
      }),
      catchError(this.errorService.handleError),
    );
  }

  private guardarEnCache(e: Especialidad): void {
    this.registros.update((lista) =>
      lista.some((x) => x.idEspecialidad === e.idEspecialidad)
        ? lista.map((x) => (x.idEspecialidad === e.idEspecialidad ? e : x))
        : [...lista, e],
    );
  }
}
