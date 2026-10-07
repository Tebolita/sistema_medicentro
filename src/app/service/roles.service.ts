import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, tap } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

// RolDto / RolInputDto reales (RolesController: CRUD completo + permisos anidados).
export interface Rol {
  idRol: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface RolInput {
  nombre: string;
  descripcion: string | null;
}

export interface RolPermiso {
  idPermiso: number;
  codigo: string;
  nombre: string;
}

@Injectable({ providedIn: 'root' })
export class RolesService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private apiUrl = 'https://localhost:7086/api/roles';

  private registros = signal<Rol[]>([]);
  cargando = signal(false);
  errorCarga = signal('');

  listar = computed(() => [...this.registros()].filter((r) => r.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)));

  constructor() {
    if (this.esNavegador) {
      this.cargar();
    }
  }

  obtener(id: number): Rol | undefined {
    return this.registros().find((r) => r.idRol === id);
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.http
      .get<ApiResponse<Rol[]>>(this.apiUrl)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.registros.set(lista);
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set('No se pudo cargar el listado de roles.');
          this.cargando.set(false);
        },
      });
  }

  obtenerPorId(id: number): Observable<Rol> {
    return this.http.get<ApiResponse<Rol>>(`${this.apiUrl}/${id}`).pipe(
      map((resp) => resp.datos as Rol),
      tap((r) => this.guardarEnCache(r)),
      catchError(this.errorService.handleError),
    );
  }

  crear(input: RolInput): Observable<Rol> {
    return this.http.post<ApiResponse<Rol>>(this.apiUrl, input).pipe(
      map((resp) => resp.datos as Rol),
      tap((r) => this.guardarEnCache(r)),
      catchError(this.errorService.handleError),
    );
  }

  actualizar(id: number, input: RolInput): Observable<Rol> {
    return this.http.put<ApiResponse<Rol>>(`${this.apiUrl}/${id}`, input).pipe(
      map((resp) => resp.datos as Rol),
      tap((r) => this.guardarEnCache(r)),
      catchError(this.errorService.handleError),
    );
  }

  // Borrado lógico (activo = false).
  eliminar(id: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.registros.update((lista) => lista.filter((r) => r.idRol !== id))),
      catchError(this.errorService.handleError),
    );
  }

  listarPermisos(idRol: number): Observable<RolPermiso[]> {
    return this.http
      .get<ApiResponse<RolPermiso[]>>(`${this.apiUrl}/${idRol}/permisos`)
      .pipe(map((resp) => resp.datos ?? []), catchError(this.errorService.handleError));
  }

  asignarPermiso(idRol: number, idPermiso: number): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.apiUrl}/${idRol}/permisos`, { idPermiso })
      .pipe(catchError(this.errorService.handleError));
  }

  quitarPermiso(idRol: number, idPermiso: number): Observable<unknown> {
    return this.http
      .delete<ApiResponse<unknown>>(`${this.apiUrl}/${idRol}/permisos/${idPermiso}`)
      .pipe(catchError(this.errorService.handleError));
  }

  private guardarEnCache(r: Rol): void {
    this.registros.update((lista) =>
      lista.some((x) => x.idRol === r.idRol) ? lista.map((x) => (x.idRol === r.idRol ? r : x)) : [...lista, r],
    );
  }
}
