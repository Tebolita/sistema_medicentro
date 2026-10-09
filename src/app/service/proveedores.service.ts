import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, tap } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

// ProveedorDto / ProveedorInputDto reales (ProveedoresController: CRUD completo).
// El correo se valida como email del lado del servidor ([EmailAddress]).
export interface Proveedor {
  idProveedor: number;
  nombre: string;
  nit: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface ProveedorInput {
  nombre: string;
  nit: string | null;
  telefono: string | null;
  correo: string | null;
  direccion: string | null;
}

@Injectable({ providedIn: 'root' })
export class ProveedoresService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private apiUrl = 'https://localhost:7086/api/proveedores';

  private registros = signal<Proveedor[]>([]);
  cargando = signal(false);
  errorCarga = signal('');

  listar = computed(() => [...this.registros()].filter((p) => p.activo).sort((a, b) => a.nombre.localeCompare(b.nombre)));

  constructor() {
    if (this.esNavegador) {
      this.cargar();
    }
  }

  obtener(id: number): Proveedor | undefined {
    return this.registros().find((p) => p.idProveedor === id);
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.http
      .get<ApiResponse<Proveedor[]>>(this.apiUrl)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.registros.set(lista);
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set('No se pudo cargar el listado de proveedores.');
          this.cargando.set(false);
        },
      });
  }

  obtenerPorId(id: number): Observable<Proveedor> {
    return this.http.get<ApiResponse<Proveedor>>(`${this.apiUrl}/${id}`).pipe(
      map((resp) => resp.datos as Proveedor),
      tap((p) => this.guardarEnCache(p)),
      catchError(this.errorService.handleError),
    );
  }

  crear(input: ProveedorInput): Observable<Proveedor> {
    return this.http.post<ApiResponse<Proveedor>>(this.apiUrl, input).pipe(
      map((resp) => resp.datos as Proveedor),
      tap((p) => this.guardarEnCache(p)),
      catchError(this.errorService.handleError),
    );
  }

  actualizar(id: number, input: ProveedorInput): Observable<Proveedor> {
    return this.http.put<ApiResponse<Proveedor>>(`${this.apiUrl}/${id}`, input).pipe(
      map((resp) => resp.datos as Proveedor),
      tap((p) => this.guardarEnCache(p)),
      catchError(this.errorService.handleError),
    );
  }

  // Borrado lógico (activo = false).
  eliminar(id: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.registros.update((lista) => lista.filter((p) => p.idProveedor !== id))),
      catchError(this.errorService.handleError),
    );
  }

  private guardarEnCache(p: Proveedor): void {
    this.registros.update((lista) =>
      lista.some((x) => x.idProveedor === p.idProveedor)
        ? lista.map((x) => (x.idProveedor === p.idProveedor ? p : x))
        : [...lista, p],
    );
  }
}

