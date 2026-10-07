import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, tap } from 'rxjs';
import { Medicamento } from '../models';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

// Cuerpo de POST/PUT. El endpoint aún NO existe en el backend: esta forma es
// la propuesta (mismo estilo que el resto de la API) y se ajusta cuando se
// cree el controlador.
export interface MedicamentoInput {
  nombre: string;
  principioActivo: string | null;
  presentacion: string | null;
  concentracion: string | null;
  idCategoriaMedicamento: number | null;
  requiereReceta: boolean;
}

@Injectable({ providedIn: 'root' })
export class MedicamentosService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private apiUrl = 'https://localhost:7086/api/medicamentos';

  private registros = signal<Medicamento[]>([]);
  cargando = signal(false);
  errorCarga = signal('');

  listar = computed(() => [...this.registros()].sort((a, b) => a.nombre.localeCompare(b.nombre)));

  // GET /api/medicamentos solo trae los activos (Where(m => m.Activo) en el
  // backend) y no hay forma de pedir los dados de baja: falta un endpoint
  // (GET /api/medicamentos/eliminados, propuesto). Mientras no exista, esto
  // falla con un mensaje claro en vez de un error genérico.
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
        error: () => {
          this.errorEliminados.set(
            'Esta vista necesita un endpoint nuevo en el backend (GET /api/medicamentos/eliminados) que todavía no existe.',
          );
          this.cargandoEliminados.set(false);
        },
      });
  }

  // Igual: falta PUT /api/medicamentos/{id}/reactivar (propuesto).
  reactivar(id: number): Observable<Medicamento> {
    return this.http.put<ApiResponse<Medicamento>>(`${this.apiUrl}/${id}/reactivar`, {}).pipe(
      map((resp) => resp.datos as Medicamento),
      tap((m) => {
        this.eliminados.update((lista) => lista.filter((x) => x.idMedicamento !== id));
        this.guardarEnCache(m);
      }),
      catchError(this.errorService.handleError),
    );
  }

  obtener(id: number): Medicamento | undefined {
    return this.registros().find((m) => m.idMedicamento === id);
  }

  // Nombre para mostrar en listados (receta, inventario).
  nombreDe(id: number): string | undefined {
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
}
