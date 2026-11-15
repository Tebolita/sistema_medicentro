import { environment } from '../../environments/environment';
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, tap } from 'rxjs';
import { Servicio, ServicioInput } from '../models';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService, esSinPermiso } from './error.service';
import { BitacoraItem } from './medicamentos.service';

@Injectable({ providedIn: 'root' })
export class ServiciosService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private apiUrl = `${environment.apiUrl}/api/servicios`;
  private apiUrlBitacora = `${environment.apiUrl}/api/bitacora-auditoria`;

  private registros = signal<Servicio[]>([]);
  cargando = signal(false);
  errorCarga = signal('');

  listar = computed(() => [...this.registros()].sort((a, b) => a.nombre.localeCompare(b.nombre)));

  private eliminados = signal<Servicio[]>([]);
  cargandoEliminados = signal(false);
  errorEliminados = signal('');

  listarEliminados = computed(() => [...this.eliminados()].sort((a, b) => a.nombre.localeCompare(b.nombre)));

  cargarEliminados(): void {
    this.cargandoEliminados.set(true);
    this.errorEliminados.set('');
    this.http
      .get<ApiResponse<Servicio[]>>(`${this.apiUrl}/eliminados`)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.eliminados.set(lista);
          this.cargandoEliminados.set(false);
        },
        error: (err: unknown) => {
          if (esSinPermiso(err)) {
            this.eliminados.set([]);
            this.cargandoEliminados.set(false);
            return;
          }
          this.errorEliminados.set('No se pudieron cargar los servicios eliminados.');
          this.cargandoEliminados.set(false);
        },
      });
  }

  reactivar(id: number): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.apiUrl}/${id}/reactivar`, {}).pipe(
      map(() => undefined),
      tap(() => {
        this.eliminados.update((lista) => lista.filter((x) => x.idServicio !== id));
        this.cargar();
      }),
      catchError(this.errorService.handleError),
    );
  }

  obtener(id: number): Servicio | undefined {
    return this.registros().find((s) => s.idServicio === id);
  }

  nombreDe(id: number | null): string | undefined {
    if (id === null) return undefined;
    return this.obtener(id)?.nombre;
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.http
      .get<ApiResponse<Servicio[]>>(this.apiUrl)
      .pipe(
        map((resp) => resp.datos ?? []),
        catchError(this.errorService.handleError),
      )
      .subscribe({
        next: (lista) => {
          this.registros.set(lista);
          this.cargando.set(false);
        },
        error: (err: Error) => {
          this.errorCarga.set(err.message);
          this.cargando.set(false);
        },
      });
  }

  obtenerPorId(id: number): Observable<Servicio> {
    return this.http.get<ApiResponse<Servicio>>(`${this.apiUrl}/${id}`).pipe(
      map((resp) => resp.datos as Servicio),
      tap((s) => this.guardarEnCache(s)),
      catchError(this.errorService.handleError),
    );
  }

  crear(input: ServicioInput): Observable<Servicio> {
    return this.http.post<ApiResponse<Servicio>>(this.apiUrl, input).pipe(
      map((resp) => resp.datos as Servicio),
      tap((s) => this.guardarEnCache(s)),
      catchError(this.errorService.handleError),
    );
  }

  actualizar(id: number, input: ServicioInput): Observable<Servicio> {
    return this.http.put<ApiResponse<Servicio>>(`${this.apiUrl}/${id}`, input).pipe(
      map((resp) => resp.datos as Servicio),
      tap((s) => this.guardarEnCache(s)),
      catchError(this.errorService.handleError),
    );
  }

  eliminar(id: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.registros.update((l) => l.filter((s) => s.idServicio !== id))),
      catchError(this.errorService.handleError),
    );
  }

  private guardarEnCache(s: Servicio): void {
    this.registros.update((lista) =>
      lista.some((x) => x.idServicio === s.idServicio)
        ? lista.map((x) => (x.idServicio === s.idServicio ? s : x))
        : [...lista, s],
    );
  }

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
