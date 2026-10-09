import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, tap } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

// PermisoDto real (PermisosController: CRUD completo). idModulo apunta a
// cat_valor_catalogo (cualquier tipo: el backend solo valida que el id
// exista, no un tipo específico) — por convención, código MODULO_SISTEMA.
export interface Permiso {
  idPermiso: number;
  codigo: string;
  nombre: string;
  idModulo: number;
  descripcion: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface PermisoInput {
  codigo: string;
  nombre: string;
  idModulo: number;
  descripcion: string | null;
}

@Injectable({ providedIn: 'root' })
export class PermisosService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private apiUrl = 'https://localhost:7086/api/permisos';

  private registros = signal<Permiso[]>([]);
  cargando = signal(false);
  errorCarga = signal('');

  listar = computed(() => [...this.registros()].filter((p) => p.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)));

  // GET /api/permisos solo trae los activos; los dados de baja se piden
  // aparte en /eliminados.
  private eliminados = signal<Permiso[]>([]);
  cargandoEliminados = signal(false);
  errorEliminados = signal('');

  listarEliminados = computed(() => [...this.eliminados()].sort((a, b) => a.nombre.localeCompare(b.nombre)));

  constructor() {
    if (this.esNavegador) {
      this.cargar();
    }
  }

  obtener(id: number): Permiso | undefined {
    return this.registros().find((p) => p.idPermiso === id);
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.http
      .get<ApiResponse<Permiso[]>>(this.apiUrl)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.registros.set(lista);
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set('No se pudo cargar el listado de permisos.');
          this.cargando.set(false);
        },
      });
  }

  cargarEliminados(): void {
    this.cargandoEliminados.set(true);
    this.errorEliminados.set('');
    this.http
      .get<ApiResponse<Permiso[]>>(`${this.apiUrl}/eliminados`)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.eliminados.set(lista);
          this.cargandoEliminados.set(false);
        },
        error: () => {
          this.errorEliminados.set('No se pudieron cargar los permisos eliminados.');
          this.cargandoEliminados.set(false);
        },
      });
  }

  obtenerPorId(id: number): Observable<Permiso> {
    return this.http.get<ApiResponse<Permiso>>(`${this.apiUrl}/${id}`).pipe(
      map((resp) => resp.datos as Permiso),
      tap((p) => this.guardarEnCache(p)),
      catchError(this.errorService.handleError),
    );
  }

  crear(input: PermisoInput): Observable<Permiso> {
    return this.http.post<ApiResponse<Permiso>>(this.apiUrl, input).pipe(
      map((resp) => resp.datos as Permiso),
      tap((p) => this.guardarEnCache(p)),
      catchError(this.errorService.handleError),
    );
  }

  actualizar(id: number, input: PermisoInput): Observable<Permiso> {
    return this.http.put<ApiResponse<Permiso>>(`${this.apiUrl}/${id}`, input).pipe(
      map((resp) => resp.datos as Permiso),
      tap((p) => this.guardarEnCache(p)),
      catchError(this.errorService.handleError),
    );
  }

  // Borrado lógico (activo = false).
  eliminar(id: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.registros.update((lista) => lista.filter((p) => p.idPermiso !== id))),
      catchError(this.errorService.handleError),
    );
  }

  // El backend solo confirma el reactivado (no devuelve el permiso
  // completo), así que para verlo en la lista de activos hay que recargarla.
  reactivar(id: number): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.apiUrl}/${id}/reactivar`, {}).pipe(
      map(() => undefined),
      tap(() => {
        this.eliminados.update((lista) => lista.filter((x) => x.idPermiso !== id));
        this.cargar();
      }),
      catchError(this.errorService.handleError),
    );
  }

  private guardarEnCache(p: Permiso): void {
    this.registros.update((lista) =>
      lista.some((x) => x.idPermiso === p.idPermiso)
        ? lista.map((x) => (x.idPermiso === p.idPermiso ? p : x))
        : [...lista, p],
    );
  }
}
