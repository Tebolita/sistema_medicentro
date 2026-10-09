import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, tap } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

// AseguradoraDto / AseguradoraInputDto reales (AseguradorasController: CRUD
// completo). idTipoEntidad no se valida contra nada del lado del backend.
export interface Aseguradora {
  idAseguradora: number;
  nombre: string;
  nit: string | null;
  idTipoEntidad: number | null;
  contacto: string | null;
  telefono: string | null;
  correo: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface AseguradoraInput {
  nombre: string;
  nit: string | null;
  idTipoEntidad: number | null;
  contacto: string | null;
  telefono: string | null;
  correo: string | null;
}

@Injectable({ providedIn: 'root' })
export class AseguradorasService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private apiUrl = 'https://localhost:7086/api/aseguradoras';

  private registros = signal<Aseguradora[]>([]);
  cargando = signal(false);
  errorCarga = signal('');

  listar = computed(() =>
    [...this.registros()].filter((a) => a.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)),
  );

  // GET /api/aseguradoras solo trae las activas; las dadas de baja se
  // piden aparte en /eliminadas.
  private eliminadas = signal<Aseguradora[]>([]);
  cargandoEliminadas = signal(false);
  errorEliminadas = signal('');

  listarEliminadas = computed(() => [...this.eliminadas()].sort((a, b) => a.nombre.localeCompare(b.nombre)));

  constructor() {
    if (this.esNavegador) {
      this.cargar();
    }
  }

  obtener(id: number): Aseguradora | undefined {
    return this.registros().find((a) => a.idAseguradora === id);
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.http
      .get<ApiResponse<Aseguradora[]>>(this.apiUrl)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.registros.set(lista);
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set('No se pudo cargar el listado de aseguradoras.');
          this.cargando.set(false);
        },
      });
  }

  cargarEliminadas(): void {
    this.cargandoEliminadas.set(true);
    this.errorEliminadas.set('');
    this.http
      .get<ApiResponse<Aseguradora[]>>(`${this.apiUrl}/eliminadas`)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.eliminadas.set(lista);
          this.cargandoEliminadas.set(false);
        },
        error: () => {
          this.errorEliminadas.set('No se pudieron cargar las aseguradoras eliminadas.');
          this.cargandoEliminadas.set(false);
        },
      });
  }

  obtenerPorId(id: number): Observable<Aseguradora> {
    return this.http.get<ApiResponse<Aseguradora>>(`${this.apiUrl}/${id}`).pipe(
      map((resp) => resp.datos as Aseguradora),
      tap((a) => this.guardarEnCache(a)),
      catchError(this.errorService.handleError),
    );
  }

  crear(input: AseguradoraInput): Observable<Aseguradora> {
    return this.http.post<ApiResponse<Aseguradora>>(this.apiUrl, input).pipe(
      map((resp) => resp.datos as Aseguradora),
      tap((a) => this.guardarEnCache(a)),
      catchError(this.errorService.handleError),
    );
  }

  actualizar(id: number, input: AseguradoraInput): Observable<Aseguradora> {
    return this.http.put<ApiResponse<Aseguradora>>(`${this.apiUrl}/${id}`, input).pipe(
      map((resp) => resp.datos as Aseguradora),
      tap((a) => this.guardarEnCache(a)),
      catchError(this.errorService.handleError),
    );
  }

  // Borrado lógico (activo = false).
  eliminar(id: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.registros.update((lista) => lista.filter((a) => a.idAseguradora !== id))),
      catchError(this.errorService.handleError),
    );
  }

  // El backend solo confirma el reactivado (no devuelve la aseguradora
  // completa), así que para verla en la lista de activas hay que recargarla.
  reactivar(id: number): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.apiUrl}/${id}/reactivar`, {}).pipe(
      map(() => undefined),
      tap(() => {
        this.eliminadas.update((lista) => lista.filter((x) => x.idAseguradora !== id));
        this.cargar();
      }),
      catchError(this.errorService.handleError),
    );
  }

  private guardarEnCache(a: Aseguradora): void {
    this.registros.update((lista) =>
      lista.some((x) => x.idAseguradora === a.idAseguradora)
        ? lista.map((x) => (x.idAseguradora === a.idAseguradora ? a : x))
        : [...lista, a],
    );
  }
}
