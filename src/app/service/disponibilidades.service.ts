import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, tap } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

// DisponibilidadDto / DisponibilidadInputDto reales (DisponibilidadMedicoController:
// CRUD completo). idDiaSemana NO se valida contra ningún catálogo en el
// backend (DisponibilidadMedicoService.ValidarMedicoAsync solo valida
// idMedico) — es un entero plano 1-7, por eso DIAS_SEMANA abajo es una lista
// fija y no hay que sembrar nada ni caer a un catálogo real.
export interface Disponibilidad {
  idDisponibilidad: number;
  idMedico: number;
  idDiaSemana: number;
  horaInicio: string; // 'HH:mm:ss'
  horaFin: string;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface DisponibilidadInput {
  idMedico: number;
  idDiaSemana: number;
  horaInicio: string;
  horaFin: string;
}

export const DIAS_SEMANA = [
  { id: 1, label: 'Lunes' },
  { id: 2, label: 'Martes' },
  { id: 3, label: 'Miércoles' },
  { id: 4, label: 'Jueves' },
  { id: 5, label: 'Viernes' },
  { id: 6, label: 'Sábado' },
  { id: 7, label: 'Domingo' },
];

@Injectable({ providedIn: 'root' })
export class DisponibilidadesService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private apiUrl = 'https://localhost:7086/api/disponibilidad-medico';

  private registros = signal<Disponibilidad[]>([]);
  cargando = signal(false);
  errorCarga = signal('');

  listar = computed(() =>
    [...this.registros()]
      .filter((d) => d.activo)
      .sort((a, b) => a.idMedico - b.idMedico || a.idDiaSemana - b.idDiaSemana),
  );

  // GET /api/disponibilidad-medico solo trae las activas; las dadas de baja
  // se piden aparte en /eliminadas (EliminadosController, clave "disponibilidad-medico").
  private eliminadas = signal<Disponibilidad[]>([]);
  cargandoEliminadas = signal(false);
  errorEliminadas = signal('');

  listarEliminadas = computed(() =>
    [...this.eliminadas()].sort((a, b) => a.idMedico - b.idMedico || a.idDiaSemana - b.idDiaSemana),
  );

  constructor() {
    if (this.esNavegador) {
      this.cargar();
    }
  }

  obtener(id: number): Disponibilidad | undefined {
    return this.registros().find((d) => d.idDisponibilidad === id);
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.http
      .get<ApiResponse<Disponibilidad[]>>(this.apiUrl)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.registros.set(lista);
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set('No se pudo cargar la disponibilidad de médicos.');
          this.cargando.set(false);
        },
      });
  }

  cargarEliminadas(): void {
    this.cargandoEliminadas.set(true);
    this.errorEliminadas.set('');
    this.http
      .get<ApiResponse<Disponibilidad[]>>(`${this.apiUrl}/eliminadas`)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.eliminadas.set(lista);
          this.cargandoEliminadas.set(false);
        },
        error: () => {
          this.errorEliminadas.set('No se pudieron cargar las disponibilidades eliminadas.');
          this.cargandoEliminadas.set(false);
        },
      });
  }

  obtenerPorId(id: number): Observable<Disponibilidad> {
    return this.http.get<ApiResponse<Disponibilidad>>(`${this.apiUrl}/${id}`).pipe(
      map((resp) => resp.datos as Disponibilidad),
      tap((d) => this.guardarEnCache(d)),
      catchError(this.errorService.handleError),
    );
  }

  crear(input: DisponibilidadInput): Observable<Disponibilidad> {
    return this.http.post<ApiResponse<Disponibilidad>>(this.apiUrl, input).pipe(
      map((resp) => resp.datos as Disponibilidad),
      tap((d) => this.guardarEnCache(d)),
      catchError(this.errorService.handleError),
    );
  }

  actualizar(id: number, input: DisponibilidadInput): Observable<Disponibilidad> {
    return this.http.put<ApiResponse<Disponibilidad>>(`${this.apiUrl}/${id}`, input).pipe(
      map((resp) => resp.datos as Disponibilidad),
      tap((d) => this.guardarEnCache(d)),
      catchError(this.errorService.handleError),
    );
  }

  // Borrado lógico (activo = false).
  eliminar(id: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.registros.update((lista) => lista.filter((d) => d.idDisponibilidad !== id))),
      catchError(this.errorService.handleError),
    );
  }

  // El backend solo confirma el reactivado (no devuelve la disponibilidad
  // completa), así que para verla en la lista de activas hay que recargarla.
  reactivar(id: number): Observable<void> {
    return this.http.put<ApiResponse<unknown>>(`${this.apiUrl}/${id}/reactivar`, {}).pipe(
      map(() => undefined),
      tap(() => {
        this.eliminadas.update((lista) => lista.filter((x) => x.idDisponibilidad !== id));
        this.cargar();
      }),
      catchError(this.errorService.handleError),
    );
  }

  private guardarEnCache(d: Disponibilidad): void {
    this.registros.update((lista) =>
      lista.some((x) => x.idDisponibilidad === d.idDisponibilidad)
        ? lista.map((x) => (x.idDisponibilidad === d.idDisponibilidad ? d : x))
        : [...lista, d],
    );
  }
}
