import { Injectable, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, tap } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

// UsuarioDto real (UsuariosController: CRUD completo + roles anidados).
export interface Usuario {
  idUsuario: number;
  idEmpleado: number | null;
  nombreUsuario: string;
  correo: string;
  idEstadoUsuario: number;
  requiereCambioPassword: boolean;
  activo: boolean;
  fechaUltimoAcceso: string | null;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

// CrearUsuarioDto: lleva contraseña, mínimo 6 caracteres (igual que el
// backend). EditarUsuarioInput NO la lleva a propósito: cambiar contraseña
// es otra acción (reset), que el backend tampoco expone todavía.
export interface UsuarioInput {
  nombreUsuario: string;
  correo: string;
  contrasena: string;
  idEmpleado: number | null;
  idEstadoUsuario: number;
  requiereCambioPassword: boolean;
}

export interface UsuarioEditInput {
  nombreUsuario: string;
  correo: string;
  idEmpleado: number | null;
  idEstadoUsuario: number;
  requiereCambioPassword: boolean;
}

export interface UsuarioRol {
  idUsuarioRol: number;
  idUsuario: number;
  idRol: number;
  nombreRol: string;
  fechaAsignacion: string;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private apiUrl = 'https://localhost:7086/api/usuarios';

  private registros = signal<Usuario[]>([]);
  cargando = signal(false);
  errorCarga = signal('');

  listar = computed(() => [...this.registros()].filter((u) => u.activo).sort((a, b) => a.nombreUsuario.localeCompare(b.nombreUsuario)));

  constructor() {
    if (this.esNavegador) {
      this.cargar();
    }
  }

  obtener(id: number): Usuario | undefined {
    return this.registros().find((u) => u.idUsuario === id);
  }

  cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.http
      .get<ApiResponse<Usuario[]>>(this.apiUrl)
      .pipe(map((resp) => resp.datos ?? []))
      .subscribe({
        next: (lista) => {
          this.registros.set(lista);
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set('No se pudo cargar el listado de usuarios.');
          this.cargando.set(false);
        },
      });
  }

  obtenerPorId(id: number): Observable<Usuario> {
    return this.http.get<ApiResponse<Usuario>>(`${this.apiUrl}/${id}`).pipe(
      map((resp) => resp.datos as Usuario),
      tap((u) => this.guardarEnCache(u)),
      catchError(this.errorService.handleError),
    );
  }

  // El backend devuelve UsuarioCreadoDto (solo id/nombreUsuario/correo), no
  // el usuario completo: se refresca el listado en vez de intentar cachear
  // un objeto parcial.
  crear(input: UsuarioInput): Observable<unknown> {
    return this.http.post<ApiResponse<unknown>>(this.apiUrl, input).pipe(
      tap(() => this.cargar()),
      catchError(this.errorService.handleError),
    );
  }

  actualizar(id: number, input: UsuarioEditInput): Observable<Usuario> {
    return this.http.put<ApiResponse<Usuario>>(`${this.apiUrl}/${id}`, input).pipe(
      map((resp) => resp.datos as Usuario),
      tap((u) => this.guardarEnCache(u)),
      catchError(this.errorService.handleError),
    );
  }

  // Borrado lógico (activo = false).
  eliminar(id: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${id}`).pipe(
      tap(() => this.registros.update((lista) => lista.filter((u) => u.idUsuario !== id))),
      catchError(this.errorService.handleError),
    );
  }

  // PUT /api/usuarios/{id}/contrasena real: CambiarContrasenaDto es
  // { nuevaContrasena, requiereCambioPassword? } — el backend NO pide ni
  // verifica la contraseña actual (quedó como un reset, no como "cambiar
  // mi propia contraseña verificando la anterior"; ver TABLAS_PENDIENTES_API.md
  // si se quiere pedir esa verificación más adelante).
  cambiarContrasena(id: number, nuevaContrasena: string, requiereCambioPassword?: boolean): Observable<unknown> {
    return this.http
      .put<ApiResponse<unknown>>(`${this.apiUrl}/${id}/contrasena`, { nuevaContrasena, requiereCambioPassword })
      .pipe(catchError(this.errorService.handleError));
  }

  listarRoles(idUsuario: number): Observable<UsuarioRol[]> {
    return this.http
      .get<ApiResponse<UsuarioRol[]>>(`${this.apiUrl}/${idUsuario}/roles`)
      .pipe(map((resp) => resp.datos ?? []), catchError(this.errorService.handleError));
  }

  asignarRol(idUsuario: number, idRol: number): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.apiUrl}/${idUsuario}/roles`, { idRol })
      .pipe(catchError(this.errorService.handleError));
  }

  quitarRol(idUsuario: number, idRol: number): Observable<unknown> {
    return this.http
      .delete<ApiResponse<unknown>>(`${this.apiUrl}/${idUsuario}/roles/${idRol}`)
      .pipe(catchError(this.errorService.handleError));
  }

  private guardarEnCache(u: Usuario): void {
    this.registros.update((lista) =>
      lista.some((x) => x.idUsuario === u.idUsuario)
        ? lista.map((x) => (x.idUsuario === u.idUsuario ? u : x))
        : [...lista, u],
    );
  }
}
