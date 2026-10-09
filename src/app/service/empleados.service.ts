import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, tap } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

// EmpleadoDto real (EmpleadosController: CRUD completo). Las fechas vienen
// como "yyyy-MM-dd" (DateOnly del backend).
export interface Empleado {
  idEmpleado: number;
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string;
  segundoApellido: string | null;
  fechaNacimiento: string | null;
  idGenero: number | null;
  idTipoDocumento: number | null;
  numeroDocumento: string | null;
  idPuesto: number;
  idEspecialidad: number | null;
  colegiado: string | null;
  fechaIngreso: string;
  fechaEgreso: string | null;
  idEstadoEmpleado: number;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

// EmpleadoInputDto real: igual que Empleado pero sin id/activo.
export interface EmpleadoInput {
  primerNombre: string;
  segundoNombre: string | null;
  primerApellido: string;
  segundoApellido: string | null;
  fechaNacimiento: string | null;
  idGenero: number | null;
  idTipoDocumento: number | null;
  numeroDocumento: string | null;
  idPuesto: number;
  idEspecialidad: number | null;
  colegiado: string | null;
  fechaIngreso: string;
  fechaEgreso: string | null;
  idEstadoEmpleado: number;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
}

@Injectable({ providedIn: 'root' })
export class EmpleadosService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private apiUrl = 'https://localhost:7086/api/empleados';

  private registros = signal<Empleado[]>([]);
  cargando = signal(false);
  errorCarga = signal('');

  listar = computed(() =>
    [...this.registros()].filter((e) => e.activo).sort((a, b) => a.primerApellido.localeCompare(b.primerApellido)),
  );

  // GET /api/empleados solo trae los activos; los dados de baja se piden
  // aparte en /eliminados.
  private eliminados = signal<Empleado[]>([]);
  cargandoEliminados = signal(false);
  errorEliminados = signal('');

  listarEliminados = computed(() =>
    [...this.eliminados()].sort((a, b) => a.primerApellido.localeCompare(b.primerApellido)),
  );

  constructor() {
    if (this.esNavegador) {
      this.cargar();
    }
  }

  obtener(id: number): Empleado | undefined {
    return this.registros().find((e) => e.idEmpleado === id);
  }

  nombreCompleto(idEmpleado: number): string {
    const e = this.registros().find((x) => x.idEmpleado === idEmpleado);
    return e ? [e.primerNombre, e.segundoNombre, e.primerApellido, e.segundoApellido].filter(Boolean).join(' ') : '—';
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.http
      .get<ApiResponse<Empleado[]>>(this.apiUrl)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.registros.set(lista);
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set('No se pudo cargar el listado de empleados.');
          this.cargando.set(false);
        },
      });
  }

  cargarEliminados(): void {
    this.cargandoEliminados.set(true);
    this.errorEliminados.set('');
    this.http
      .get<ApiResponse<Empleado[]>>(`${this.apiUrl}/eliminados`)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.eliminados.set(lista);
          this.cargandoEliminados.set(false);
        },
        error: () => {
          this.errorEliminados.set('No se pudieron cargar los empleados eliminados.');
          this.cargandoEliminados.set(false);
        },
      });
  }

  obtenerPorId(id: number): Observable<Empleado> {
    return this.http.get<ApiResponse<Empleado>>(`${this.apiUrl}/${id}`).pipe(
      map((resp) => resp.datos as Empleado),
      tap((e) => this.guardarEnCache(e)),
      catchError(this.errorService.handleError),
    );
  }

  crear(input: EmpleadoInput): Observable<Empleado> {
    return this.http.post<ApiResponse<Empleado>>(this.apiUrl, input).pipe(
      map((resp) => resp.datos as Empleado),
      tap((e) => this.guardarEnCache(e)),
      catchError(this.errorService.handleError),
    );
  }

  actualizar(id: number, input: EmpleadoInput): Observable<Empleado> {
    return this.http.put<ApiResponse<Empleado>>(`${this.apiUrl}/${id}`, input).pipe(
      map((resp) => resp.datos as Empleado),
      tap((e) => this.guardarEnCache(e)),
      catchError(this.errorService.handleError),
    );
  }

  // Borrado lógico (activo = false).
  eliminar(id: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.registros.update((lista) => lista.filter((e) => e.idEmpleado !== id))),
      catchError(this.errorService.handleError),
    );
  }

  // El backend solo confirma el reactivado (no devuelve el empleado
  // completo), así que para verlo en la lista de activos hay que recargarla.
  reactivar(id: number): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.apiUrl}/${id}/reactivar`, {}).pipe(
      map(() => undefined),
      tap(() => {
        this.eliminados.update((lista) => lista.filter((x) => x.idEmpleado !== id));
        this.cargar();
      }),
      catchError(this.errorService.handleError),
    );
  }

  private guardarEnCache(e: Empleado): void {
    this.registros.update((lista) =>
      lista.some((x) => x.idEmpleado === e.idEmpleado)
        ? lista.map((x) => (x.idEmpleado === e.idEmpleado ? e : x))
        : [...lista, e],
    );
  }
}
