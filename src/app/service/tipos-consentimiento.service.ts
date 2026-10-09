import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, tap } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

// TipoConsentimientoDto / TipoConsentimientoInputDto reales
// (CatalogosPropiosController: CRUD completo). El código ya lo usan otros
// módulos para resolver el tipo por convención (p. ej. "COMPROMISO_PAGO"
// en CompromisosPagoService), así que hay que tener cuidado al editarlo.
export interface TipoConsentimiento {
  idTipoConsentimiento: number;
  codigo: string;
  nombre: string;
  plantillaTexto: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface TipoConsentimientoInput {
  codigo: string;
  nombre: string;
  plantillaTexto: string | null;
}

@Injectable({ providedIn: 'root' })
export class TiposConsentimientoService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private apiUrl = 'https://localhost:7086/api/tipos-consentimiento';

  private registros = signal<TipoConsentimiento[]>([]);
  cargando = signal(false);
  errorCarga = signal('');

  listar = computed(() =>
    [...this.registros()].filter((t) => t.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)),
  );

  // GET /api/tipos-consentimiento solo trae los activos; los dados de baja
  // se piden aparte en /eliminadas.
  private eliminados = signal<TipoConsentimiento[]>([]);
  cargandoEliminados = signal(false);
  errorEliminados = signal('');

  listarEliminados = computed(() => [...this.eliminados()].sort((a, b) => a.nombre.localeCompare(b.nombre)));

  constructor() {
    if (this.esNavegador) {
      this.cargar();
    }
  }

  obtener(id: number): TipoConsentimiento | undefined {
    return this.registros().find((t) => t.idTipoConsentimiento === id);
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.http
      .get<ApiResponse<TipoConsentimiento[]>>(this.apiUrl)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.registros.set(lista);
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set('No se pudo cargar el listado de tipos de consentimiento.');
          this.cargando.set(false);
        },
      });
  }

  cargarEliminados(): void {
    this.cargandoEliminados.set(true);
    this.errorEliminados.set('');
    this.http
      .get<ApiResponse<TipoConsentimiento[]>>(`${this.apiUrl}/eliminadas`)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.eliminados.set(lista);
          this.cargandoEliminados.set(false);
        },
        error: () => {
          this.errorEliminados.set('No se pudieron cargar los tipos de consentimiento eliminados.');
          this.cargandoEliminados.set(false);
        },
      });
  }

  obtenerPorId(id: number): Observable<TipoConsentimiento> {
    return this.http.get<ApiResponse<TipoConsentimiento>>(`${this.apiUrl}/${id}`).pipe(
      map((resp) => resp.datos as TipoConsentimiento),
      tap((t) => this.guardarEnCache(t)),
      catchError(this.errorService.handleError),
    );
  }

  crear(input: TipoConsentimientoInput): Observable<TipoConsentimiento> {
    return this.http.post<ApiResponse<TipoConsentimiento>>(this.apiUrl, input).pipe(
      map((resp) => resp.datos as TipoConsentimiento),
      tap((t) => this.guardarEnCache(t)),
      catchError(this.errorService.handleError),
    );
  }

  actualizar(id: number, input: TipoConsentimientoInput): Observable<TipoConsentimiento> {
    return this.http.put<ApiResponse<TipoConsentimiento>>(`${this.apiUrl}/${id}`, input).pipe(
      map((resp) => resp.datos as TipoConsentimiento),
      tap((t) => this.guardarEnCache(t)),
      catchError(this.errorService.handleError),
    );
  }

  // Borrado lógico (activo = false).
  eliminar(id: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.registros.update((lista) => lista.filter((t) => t.idTipoConsentimiento !== id))),
      catchError(this.errorService.handleError),
    );
  }

  // El backend solo confirma el reactivado (no devuelve el tipo completo),
  // así que para verlo en la lista de activos hay que recargarla.
  reactivar(id: number): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.apiUrl}/${id}/reactivar`, {}).pipe(
      map(() => undefined),
      tap(() => {
        this.eliminados.update((lista) => lista.filter((x) => x.idTipoConsentimiento !== id));
        this.cargar();
      }),
      catchError(this.errorService.handleError),
    );
  }

  private guardarEnCache(t: TipoConsentimiento): void {
    this.registros.update((lista) =>
      lista.some((x) => x.idTipoConsentimiento === t.idTipoConsentimiento)
        ? lista.map((x) => (x.idTipoConsentimiento === t.idTipoConsentimiento ? t : x))
        : [...lista, t],
    );
  }
}
