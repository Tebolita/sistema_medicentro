import { environment } from '../../environments/environment';
import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, tap } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

// TipoExamenDto / TipoExamenInputDto reales (CatalogosPropiosController:
// CRUD completo). idCategoriaExamen SÍ se valida contra cat_valor_catalogo
// (cualquier tipo) — ver scripts/sembrar_catalogos.sql, código CATEGORIA_EXAMEN.
export interface TipoExamen {
  idTipoExamen: number;
  nombre: string;
  idCategoriaExamen: number;
  descripcion: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface TipoExamenInput {
  nombre: string;
  idCategoriaExamen: number;
  descripcion: string | null;
}

// Bitácora de auditoría (patrón igual a SalasService/CompromisosPagoService):
// el endpoint real es /api/bitacora-auditoria?tablaAfectada=... y siempre
// devuelve todos los registros de esa tabla, así que el filtrado por
// registro se hace en el frontend.
export interface BitacoraItem {
  idBitacora: number;
  idUsuario: number | null;
  idTipoAccion: number;
  tablaAfectada: string;
  idRegistroAfectado: number | null;
  valoresAnteriores: string | null;
  valoresNuevos: string | null;
  ipOrigen: string | null;
  fechaHora: string;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class TiposExamenService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private apiUrl = `${environment.apiUrl}/api/tipos-examen`;
  private apiUrlBitacora = `${environment.apiUrl}/api/bitacora-auditoria`;

  private registros = signal<TipoExamen[]>([]);
  cargando = signal(false);
  errorCarga = signal('');

  listar = computed(() =>
    [...this.registros()].filter((t) => t.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)),
  );

  // GET /api/tipos-examen solo trae los activos; los dados de baja se
  // piden aparte en /eliminados.
  private eliminados = signal<TipoExamen[]>([]);
  cargandoEliminados = signal(false);
  errorEliminados = signal('');

  listarEliminados = computed(() => [...this.eliminados()].sort((a, b) => a.nombre.localeCompare(b.nombre)));

  constructor() {
    if (this.esNavegador) {
      this.cargar();
    }
  }

  obtener(id: number): TipoExamen | undefined {
    return this.registros().find((t) => t.idTipoExamen === id);
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.http
      .get<ApiResponse<TipoExamen[]>>(this.apiUrl)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.registros.set(lista);
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set('No se pudo cargar el listado de tipos de examen.');
          this.cargando.set(false);
        },
      });
  }

  cargarEliminados(): void {
    this.cargandoEliminados.set(true);
    this.errorEliminados.set('');
    this.http
      .get<ApiResponse<TipoExamen[]>>(`${this.apiUrl}/eliminados`)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.eliminados.set(lista);
          this.cargandoEliminados.set(false);
        },
        error: () => {
          this.errorEliminados.set('No se pudieron cargar los tipos de examen eliminados.');
          this.cargandoEliminados.set(false);
        },
      });
  }

  obtenerPorId(id: number): Observable<TipoExamen> {
    return this.http.get<ApiResponse<TipoExamen>>(`${this.apiUrl}/${id}`).pipe(
      map((resp) => resp.datos as TipoExamen),
      tap((t) => this.guardarEnCache(t)),
      catchError(this.errorService.handleError),
    );
  }

  crear(input: TipoExamenInput): Observable<TipoExamen> {
    return this.http.post<ApiResponse<TipoExamen>>(this.apiUrl, input).pipe(
      map((resp) => resp.datos as TipoExamen),
      tap((t) => this.guardarEnCache(t)),
      catchError(this.errorService.handleError),
    );
  }

  actualizar(id: number, input: TipoExamenInput): Observable<TipoExamen> {
    return this.http.put<ApiResponse<TipoExamen>>(`${this.apiUrl}/${id}`, input).pipe(
      map((resp) => resp.datos as TipoExamen),
      tap((t) => this.guardarEnCache(t)),
      catchError(this.errorService.handleError),
    );
  }

  // Borrado lógico (activo = false).
  eliminar(id: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.registros.update((lista) => lista.filter((t) => t.idTipoExamen !== id))),
      catchError(this.errorService.handleError),
    );
  }

  // El backend solo confirma el reactivado (no devuelve el tipo completo),
  // así que para verlo en la lista de activos hay que recargarla.
  reactivar(id: number): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.apiUrl}/${id}/reactivar`, {}).pipe(
      map(() => undefined),
      tap(() => {
        this.eliminados.update((lista) => lista.filter((x) => x.idTipoExamen !== id));
        this.cargar();
      }),
      catchError(this.errorService.handleError),
    );
  }

  private guardarEnCache(t: TipoExamen): void {
    this.registros.update((lista) =>
      lista.some((x) => x.idTipoExamen === t.idTipoExamen)
        ? lista.map((x) => (x.idTipoExamen === t.idTipoExamen ? t : x))
        : [...lista, t],
    );
  }

  // =============================================================
  // BITÁCORA DE AUDITORÍA
  // =============================================================

  RetornarBitacoraPorRegistro(tablaAfectada: string, idRegistro: number): Observable<BitacoraItem[]> {
    return this.http
      .get<ApiResponse<BitacoraItem[]>>(`${this.apiUrlBitacora}?tablaAfectada=${encodeURIComponent(tablaAfectada)}`)
      .pipe(
        map((resp) =>
          (resp.datos ?? [])
            .filter((b) => b.idRegistroAfectado === idRegistro)
            .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora)),
        ),
        catchError(this.errorService.handleError),
      );
  }

  RetornarBitacoraGeneral(tablaAfectada: string): Observable<BitacoraItem[]> {
    return this.http
      .get<ApiResponse<BitacoraItem[]>>(`${this.apiUrlBitacora}?tablaAfectada=${encodeURIComponent(tablaAfectada)}`)
      .pipe(
        map((resp) => (resp.datos ?? []).sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))),
        catchError(this.errorService.handleError),
      );
  }
}
