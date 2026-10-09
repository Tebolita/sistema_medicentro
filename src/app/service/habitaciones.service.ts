import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, tap } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

// HabitacionDto / CamaDto reales (HabitacionesController). GET/POST/PUT de
// habitación siempre devuelven HabitacionCompletaDto { habitacion, camas },
// igual que facturas con sus detalles.
export interface Habitacion {
  idHabitacion: number;
  numero: string;
  piso: number | null;
  idTipoHabitacion: number | null;
  idEstadoHabitacion: number;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface Cama {
  idCama: number;
  idHabitacion: number;
  numeroCama: string;
  idEstadoCama: number;
  activo: boolean;
}

export interface HabitacionCompleta {
  habitacion: Habitacion;
  camas: Cama[];
}

export interface HabitacionInput {
  numero: string;
  piso: number | null;
  idTipoHabitacion: number | null;
  idEstadoHabitacion: number;
}

export interface CamaInput {
  numeroCama: string;
  idEstadoCama: number;
}

@Injectable({ providedIn: 'root' })
export class HabitacionesService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private apiUrl = 'https://localhost:7086/api/habitaciones';

  private registros = signal<HabitacionCompleta[]>([]);
  cargando = signal(false);
  errorCarga = signal('');

  listar = computed(() =>
    [...this.registros()].filter((r) => r.habitacion.activo).sort((a, b) => a.habitacion.numero.localeCompare(b.habitacion.numero)),
  );

  // GET /api/habitaciones solo trae las activas; las dadas de baja se
  // piden aparte en /eliminadas.
  private eliminadas = signal<HabitacionCompleta[]>([]);
  cargandoEliminadas = signal(false);
  errorEliminadas = signal('');

  listarEliminadas = computed(() =>
    [...this.eliminadas()].sort((a, b) => a.habitacion.numero.localeCompare(b.habitacion.numero)),
  );

  constructor() {
    if (this.esNavegador) {
      this.cargar();
    }
  }

  obtener(id: number): HabitacionCompleta | undefined {
    return this.registros().find((r) => r.habitacion.idHabitacion === id);
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.http
      .get<ApiResponse<HabitacionCompleta[]>>(this.apiUrl)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.registros.set(lista);
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set('No se pudo cargar el listado de habitaciones.');
          this.cargando.set(false);
        },
      });
  }

  cargarEliminadas(): void {
    this.cargandoEliminadas.set(true);
    this.errorEliminadas.set('');
    this.http
      .get<ApiResponse<HabitacionCompleta[]>>(`${this.apiUrl}/eliminadas`)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.eliminadas.set(lista);
          this.cargandoEliminadas.set(false);
        },
        error: () => {
          this.errorEliminadas.set('No se pudieron cargar las habitaciones eliminadas.');
          this.cargandoEliminadas.set(false);
        },
      });
  }

  obtenerPorId(id: number): Observable<HabitacionCompleta> {
    return this.http.get<ApiResponse<HabitacionCompleta>>(`${this.apiUrl}/${id}`).pipe(
      map((resp) => resp.datos as HabitacionCompleta),
      tap((r) => this.guardarEnCache(r)),
      catchError(this.errorService.handleError),
    );
  }

  crear(input: HabitacionInput): Observable<HabitacionCompleta> {
    return this.http.post<ApiResponse<HabitacionCompleta>>(this.apiUrl, input).pipe(
      map((resp) => resp.datos as HabitacionCompleta),
      tap((r) => this.guardarEnCache(r)),
      catchError(this.errorService.handleError),
    );
  }

  actualizar(id: number, input: HabitacionInput): Observable<HabitacionCompleta> {
    return this.http.put<ApiResponse<HabitacionCompleta>>(`${this.apiUrl}/${id}`, input).pipe(
      map((resp) => resp.datos as HabitacionCompleta),
      tap((r) => this.guardarEnCache(r)),
      catchError(this.errorService.handleError),
    );
  }

  // Borrado lógico (activo = false).
  eliminar(id: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.registros.update((lista) => lista.filter((r) => r.habitacion.idHabitacion !== id))),
      catchError(this.errorService.handleError),
    );
  }

  // El backend solo confirma el reactivado (no devuelve la habitación
  // completa), así que para verla en la lista de activas hay que recargarla.
  reactivar(id: number): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.apiUrl}/${id}/reactivar`, {}).pipe(
      map(() => undefined),
      tap(() => {
        this.eliminadas.update((lista) => lista.filter((x) => x.habitacion.idHabitacion !== id));
        this.cargar();
      }),
      catchError(this.errorService.handleError),
    );
  }

  // --- Camas (anidadas bajo una habitación) ---

  agregarCama(idHabitacion: number, input: CamaInput): Observable<Cama> {
    return this.http.post<ApiResponse<Cama>>(`${this.apiUrl}/${idHabitacion}/camas`, input).pipe(
      map((resp) => resp.datos as Cama),
      tap((cama) => this.agregarCamaEnCache(idHabitacion, cama)),
      catchError(this.errorService.handleError),
    );
  }

  editarCama(idHabitacion: number, idCama: number, input: CamaInput): Observable<Cama> {
    return this.http.put<ApiResponse<Cama>>(`${this.apiUrl}/${idHabitacion}/camas/${idCama}`, input).pipe(
      map((resp) => resp.datos as Cama),
      tap((cama) => this.actualizarCamaEnCache(idHabitacion, cama)),
      catchError(this.errorService.handleError),
    );
  }

  eliminarCama(idHabitacion: number, idCama: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${idHabitacion}/camas/${idCama}`).pipe(
      tap(() => this.quitarCamaDeCache(idHabitacion, idCama)),
      catchError(this.errorService.handleError),
    );
  }

  private guardarEnCache(r: HabitacionCompleta): void {
    this.registros.update((lista) =>
      lista.some((x) => x.habitacion.idHabitacion === r.habitacion.idHabitacion)
        ? lista.map((x) => (x.habitacion.idHabitacion === r.habitacion.idHabitacion ? r : x))
        : [...lista, r],
    );
  }

  private agregarCamaEnCache(idHabitacion: number, cama: Cama): void {
    this.registros.update((lista) =>
      lista.map((r) =>
        r.habitacion.idHabitacion === idHabitacion ? { ...r, camas: [...r.camas, cama] } : r,
      ),
    );
  }

  private actualizarCamaEnCache(idHabitacion: number, cama: Cama): void {
    this.registros.update((lista) =>
      lista.map((r) =>
        r.habitacion.idHabitacion === idHabitacion
          ? { ...r, camas: r.camas.map((c) => (c.idCama === cama.idCama ? cama : c)) }
          : r,
      ),
    );
  }

  private quitarCamaDeCache(idHabitacion: number, idCama: number): void {
    this.registros.update((lista) =>
      lista.map((r) =>
        r.habitacion.idHabitacion === idHabitacion
          ? { ...r, camas: r.camas.filter((c) => c.idCama !== idCama) }
          : r,
      ),
    );
  }
}
