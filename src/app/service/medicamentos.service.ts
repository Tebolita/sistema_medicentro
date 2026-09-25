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
