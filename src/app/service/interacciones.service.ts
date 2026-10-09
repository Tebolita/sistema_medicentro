import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, tap } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

// InteraccionDto / InteraccionInputDto reales (InteraccionesMedicamentosController:
// CRUD completo). idNivelSeveridad NO se valida contra ningún catálogo en el
// backend (InteraccionesMedicamentosService no lo revisa en absoluto) — pero
// sí se reutiliza el catálogo real 'SEVERIDAD' que ya usa Pacientes (alergias)
// para no inventar otra escala de severidad aparte.
export interface Interaccion {
  idInteraccion: number;
  idMedicamento1: number;
  idMedicamento2: number;
  idNivelSeveridad: number;
  descripcion: string;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface InteraccionInput {
  idMedicamento1: number;
  idMedicamento2: number;
  idNivelSeveridad: number;
  descripcion: string;
}

@Injectable({ providedIn: 'root' })
export class InteraccionesService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private apiUrl = 'https://localhost:7086/api/interacciones-medicamentos';

  private registros = signal<Interaccion[]>([]);
  cargando = signal(false);
  errorCarga = signal('');

  listar = computed(() => [...this.registros()].sort((a, b) => a.idInteraccion - b.idInteraccion));

  // GET /api/interacciones-medicamentos solo trae las activas; las dadas de
  // baja se piden aparte en /eliminadas (EliminadosController, clave "interacciones-medicamentos").
  private eliminadas = signal<Interaccion[]>([]);
  cargandoEliminadas = signal(false);
  errorEliminadas = signal('');

  listarEliminadas = computed(() => [...this.eliminadas()].sort((a, b) => a.idInteraccion - b.idInteraccion));

  constructor() {
    if (this.esNavegador) {
      this.cargar();
    }
  }

  obtener(id: number): Interaccion | undefined {
    return this.registros().find((i) => i.idInteraccion === id);
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.http
      .get<ApiResponse<Interaccion[]>>(this.apiUrl)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.registros.set(lista);
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set('No se pudo cargar el listado de interacciones.');
          this.cargando.set(false);
        },
      });
  }

  cargarEliminadas(): void {
    this.cargandoEliminadas.set(true);
    this.errorEliminadas.set('');
    this.http
      .get<ApiResponse<Interaccion[]>>(`${this.apiUrl}/eliminadas`)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.eliminadas.set(lista);
          this.cargandoEliminadas.set(false);
        },
        error: () => {
          this.errorEliminadas.set('No se pudieron cargar las interacciones eliminadas.');
          this.cargandoEliminadas.set(false);
        },
      });
  }

  obtenerPorId(id: number): Observable<Interaccion> {
    return this.http.get<ApiResponse<Interaccion>>(`${this.apiUrl}/${id}`).pipe(
      map((resp) => resp.datos as Interaccion),
      tap((i) => this.guardarEnCache(i)),
      catchError(this.errorService.handleError),
    );
  }

  crear(input: InteraccionInput): Observable<Interaccion> {
    return this.http.post<ApiResponse<Interaccion>>(this.apiUrl, input).pipe(
      map((resp) => resp.datos as Interaccion),
      tap((i) => this.guardarEnCache(i)),
      catchError(this.errorService.handleError),
    );
  }

  actualizar(id: number, input: InteraccionInput): Observable<Interaccion> {
    return this.http.put<ApiResponse<Interaccion>>(`${this.apiUrl}/${id}`, input).pipe(
      map((resp) => resp.datos as Interaccion),
      tap((i) => this.guardarEnCache(i)),
      catchError(this.errorService.handleError),
    );
  }

  // Borrado lógico (activo = false).
  eliminar(id: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.registros.update((lista) => lista.filter((i) => i.idInteraccion !== id))),
      catchError(this.errorService.handleError),
    );
  }

  // El backend solo confirma el reactivado (no devuelve la interacción
  // completa), así que para verla en la lista de activas hay que recargarla.
  reactivar(id: number): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.apiUrl}/${id}/reactivar`, {}).pipe(
      map(() => undefined),
      tap(() => {
        this.eliminadas.update((lista) => lista.filter((x) => x.idInteraccion !== id));
        this.cargar();
      }),
      catchError(this.errorService.handleError),
    );
  }

  private guardarEnCache(i: Interaccion): void {
    this.registros.update((lista) =>
      lista.some((x) => x.idInteraccion === i.idInteraccion)
        ? lista.map((x) => (x.idInteraccion === i.idInteraccion ? i : x))
        : [...lista, i],
    );
  }
}
