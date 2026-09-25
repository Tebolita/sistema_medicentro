import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, tap } from 'rxjs';
import { Receta, RecetaDetalle } from '../models';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

// Igual que RecetaCompletaDto del backend: { receta, detalles }.
export interface RecetaCompleta {
  receta: Receta;
  detalles: RecetaDetalle[];
}

// RecetaInputDto: lo que se envía al crear/editar. En los detalles,
// idRecetaDetalle = 0 significa "nuevo"; al editar, los detalles que no se
// envíen se dan de baja en el backend, así que siempre va la lista completa.
export interface RecetaInput {
  idTratamiento: number | null;
  idPaciente: number;
  idMedico: number;
  fechaEmision: string;
  firmaDigitalHash: string | null;
  firmaDigitalUrl: string | null;
  idEstadoReceta: number;
  detalles: {
    idRecetaDetalle: number;
    idMedicamento: number;
    dosis: string;
    frecuencia: string;
    duracion: string | null;
    indicaciones: string | null;
  }[];
}

@Injectable({ providedIn: 'root' })
export class RecetasService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private apiUrl = 'https://localhost:7086/api/recetas';

  private registros = signal<RecetaCompleta[]>([]);
  cargando = signal(false);
  errorCarga = signal('');

  listar = computed(() =>
    [...this.registros()].sort((a, b) => b.receta.fechaEmision.localeCompare(a.receta.fechaEmision)),
  );

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.http
      .get<ApiResponse<RecetaCompleta[]>>(this.apiUrl)
      .pipe(catchError(this.errorService.handleError))
      .subscribe({
        next: (resp) => {
          this.registros.set(resp.datos ?? []);
          this.cargando.set(false);
        },
        error: (err: Error) => {
          this.errorCarga.set(err.message);
          this.cargando.set(false);
        },
      });
  }

  obtener(id: number): Observable<RecetaCompleta> {
    return this.http.get<ApiResponse<RecetaCompleta>>(`${this.apiUrl}/${id}`).pipe(
      map((resp) => resp.datos as RecetaCompleta),
      catchError(this.errorService.handleError),
    );
  }

  crear(receta: RecetaInput): Observable<RecetaCompleta> {
    return this.http.post<ApiResponse<RecetaCompleta>>(this.apiUrl, receta).pipe(
      map((resp) => resp.datos as RecetaCompleta),
      tap((nueva) => this.registros.update((lista) => [...lista, nueva])),
      catchError(this.errorService.handleError),
    );
  }

  actualizar(id: number, receta: RecetaInput): Observable<RecetaCompleta> {
    return this.http.put<ApiResponse<RecetaCompleta>>(`${this.apiUrl}/${id}`, receta).pipe(
      map((resp) => resp.datos as RecetaCompleta),
      tap((editada) =>
        this.registros.update((lista) => lista.map((r) => (r.receta.idReceta === id ? editada : r))),
      ),
      catchError(this.errorService.handleError),
    );
  }

  // Borrado lógico en el backend (activo = false).
  eliminar(id: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.registros.update((lista) => lista.filter((r) => r.receta.idReceta !== id))),
      catchError(this.errorService.handleError),
    );
  }
}
