import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, tap } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

// PuestoDto / PuestoInputDto reales (RecursosHumanosController: CRUD completo).
export interface Puesto {
  idPuesto: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface PuestoInput {
  nombre: string;
  descripcion: string | null;
}

@Injectable({ providedIn: 'root' })
export class PuestosService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private apiUrl = 'https://localhost:7086/api/puestos';

  private registros = signal<Puesto[]>([]);
  cargando = signal(false);
  errorCarga = signal('');

  listar = computed(() => [...this.registros()].filter((p) => p.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)));

  // GET /api/puestos solo trae los activos; los dados de baja se piden
  // aparte en /eliminados.
  private eliminados = signal<Puesto[]>([]);
  cargandoEliminados = signal(false);
  errorEliminados = signal('');

  listarEliminados = computed(() => [...this.eliminados()].sort((a, b) => a.nombre.localeCompare(b.nombre)));

  constructor() {
    if (this.esNavegador) {
      this.cargar();
    }
  }

  obtener(id: number): Puesto | undefined {
    return this.registros().find((p) => p.idPuesto === id);
  }

  nombreDe(id: number): string | undefined {
    return this.obtener(id)?.nombre;
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.http
      .get<ApiResponse<Puesto[]>>(this.apiUrl)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.registros.set(lista);
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set('No se pudo cargar el listado de puestos.');
          this.cargando.set(false);
        },
      });
  }

  cargarEliminados(): void {
    this.cargandoEliminados.set(true);
    this.errorEliminados.set('');
    this.http
      .get<ApiResponse<Puesto[]>>(`${this.apiUrl}/eliminados`)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.eliminados.set(lista);
          this.cargandoEliminados.set(false);
        },
        error: () => {
          this.errorEliminados.set('No se pudieron cargar los puestos eliminados.');
          this.cargandoEliminados.set(false);
        },
      });
  }

  obtenerPorId(id: number): Observable<Puesto> {
    return this.http.get<ApiResponse<Puesto>>(`${this.apiUrl}/${id}`).pipe(
      map((resp) => resp.datos as Puesto),
      tap((p) => this.guardarEnCache(p)),
      catchError(this.errorService.handleError),
    );
  }

  crear(input: PuestoInput): Observable<Puesto> {
    return this.http.post<ApiResponse<Puesto>>(this.apiUrl, input).pipe(
      map((resp) => resp.datos as Puesto),
      tap((p) => this.guardarEnCache(p)),
      catchError(this.errorService.handleError),
    );
  }

  actualizar(id: number, input: PuestoInput): Observable<Puesto> {
    return this.http.put<ApiResponse<Puesto>>(`${this.apiUrl}/${id}`, input).pipe(
      map((resp) => resp.datos as Puesto),
      tap((p) => this.guardarEnCache(p)),
      catchError(this.errorService.handleError),
    );
  }

  // Borrado lógico (activo = false).
  eliminar(id: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.registros.update((lista) => lista.filter((p) => p.idPuesto !== id))),
      catchError(this.errorService.handleError),
    );
  }

  // El backend solo confirma el reactivado (no devuelve el puesto completo),
  // así que para verlo en la lista de activos hay que recargarla.
  reactivar(id: number): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.apiUrl}/${id}/reactivar`, {}).pipe(
      map(() => undefined),
      tap(() => {
        this.eliminados.update((lista) => lista.filter((x) => x.idPuesto !== id));
        this.cargar();
      }),
      catchError(this.errorService.handleError),
    );
  }

  private guardarEnCache(p: Puesto): void {
    this.registros.update((lista) =>
      lista.some((x) => x.idPuesto === p.idPuesto) ? lista.map((x) => (x.idPuesto === p.idPuesto ? p : x)) : [...lista, p],
    );
  }
}
