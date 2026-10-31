import { environment } from '../../environments/environment';
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, tap } from 'rxjs';
import { Medicamento } from '../models';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService, esSinPermiso } from './error.service';

// Cuerpo de POST/PUT. El endpoint aún NO existe en el backend: esta forma es
// la propuesta (mismo estilo que el resto de la API) y se ajusta cuando se
// cree el controlador.
export interface MedicamentoInput {
  nombre: string;
  principioActivo: string | null;
  presentacion: string | null;
  concentracion: string | null;
  idCategoriaMedicamento: number | null;
  idDestinoMedicamento: number | null;
  requiereReceta: boolean;
  precioVentaPublico: number;
}

// Fila de bitacora_auditoria (ver compromisos-pago.service.ts). Se usa para
// armar el historial general (lista) y el historial por registro (formulario).
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
export class MedicamentosService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private apiUrl = `${environment.apiUrl}/api/medicamentos`;
  private apiUrlBitacora = `${environment.apiUrl}/api/bitacora-auditoria`;

  private registros = signal<Medicamento[]>([]);
  cargando = signal(false);
  errorCarga = signal('');

  listar = computed(() => [...this.registros()].sort((a, b) => a.nombre.localeCompare(b.nombre)));

  // GET /api/medicamentos solo trae los activos (Where(m => m.Activo) en el
  // backend); los dados de baja se piden aparte en /eliminados.
  private eliminados = signal<Medicamento[]>([]);
  cargandoEliminados = signal(false);
  errorEliminados = signal('');

  listarEliminados = computed(() => [...this.eliminados()].sort((a, b) => a.nombre.localeCompare(b.nombre)));

  cargarEliminados(): void {
    this.cargandoEliminados.set(true);
    this.errorEliminados.set('');
    this.http
      .get<ApiResponse<Medicamento[]>>(`${this.apiUrl}/eliminados`)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.eliminados.set(lista);
          this.cargandoEliminados.set(false);
        },
        error: (err: unknown) => {
          // Sin acceso a lo eliminado: la pestaña se muestra vacía, no como error.
          if (esSinPermiso(err)) {
            this.eliminados.set([]);
            this.cargandoEliminados.set(false);
            return;
          }
          this.errorEliminados.set('No se pudieron cargar los medicamentos eliminados.');
          this.cargandoEliminados.set(false);
        },
      });
  }

  // El backend solo confirma el reactivado (no devuelve el medicamento
  // completo), así que para verlo en la lista de activos hay que recargarla.
  reactivar(id: number): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.apiUrl}/${id}/reactivar`, {}).pipe(
      map(() => undefined),
      tap(() => {
        this.eliminados.update((lista) => lista.filter((x) => x.idMedicamento !== id));
        this.cargar();
      }),
      catchError(this.errorService.handleError),
    );
  }

  obtener(id: number): Medicamento | undefined {
    return this.registros().find((m) => m.idMedicamento === id);
  }

  // Nombre para mostrar en listados (receta, inventario).
  nombreDe(id: number | null): string | undefined {
    if (id === null) return undefined;
    return this.obtener(id)?.nombre;
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.http
      .get<ApiResponse<Medicamento[]>>(this.apiUrl)
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

  // Para abrir un medicamento directo por URL (recarga de página).
  obtenerPorId(id: number): Observable<Medicamento> {
    return this.http.get<ApiResponse<Medicamento>>(`${this.apiUrl}/${id}`).pipe(
      map((resp) => resp.datos as Medicamento),
      tap((m) => this.guardarEnCache(m)),
      catchError(this.errorService.handleError),
    );
  }

  crear(input: MedicamentoInput): Observable<Medicamento> {
    return this.http.post<ApiResponse<Medicamento>>(this.apiUrl, input).pipe(
      map((resp) => resp.datos as Medicamento),
      tap((m) => this.guardarEnCache(m)),
      catchError(this.errorService.handleError),
    );
  }

  actualizar(id: number, input: MedicamentoInput): Observable<Medicamento> {
    return this.http.put<ApiResponse<Medicamento>>(`${this.apiUrl}/${id}`, input).pipe(
      map((resp) => resp.datos as Medicamento),
      tap((m) => this.guardarEnCache(m)),
      catchError(this.errorService.handleError),
    );
  }

  // Borrado lógico (activo = false).
  eliminar(id: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.registros.update((l) => l.filter((m) => m.idMedicamento !== id))),
      catchError(this.errorService.handleError),
    );
  }

  private guardarEnCache(m: Medicamento): void {
    this.registros.update((lista) =>
      lista.some((x) => x.idMedicamento === m.idMedicamento)
        ? lista.map((x) => (x.idMedicamento === m.idMedicamento ? m : x))
        : [...lista, m],
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
