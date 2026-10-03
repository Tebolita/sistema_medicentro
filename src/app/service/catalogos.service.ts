import { Injectable, PLATFORM_ID, Signal, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of, tap } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

// Cuerpos para crear un tipo o un valor de catálogo (CatalogosController).
export interface CatalogoTipoInput {
  codigo: string;
  nombre: string;
  descripcion: string | null;
}

export interface CatalogoValorInput {
  codigo: string;
  nombre: string;
  descripcion: string | null;
  orden: number;
}

export interface CatalogoValor {
  id: number;
  codigo: string;
  nombre: string;
  orden: number;
}

// GET /api/catalogos/{codigoTipo}: valores REALES de cat_valor_catalogo, en
// vez de los ids fijos que traían los dropdowns antes. Solo unos pocos
// códigos de catálogo están confirmados con el backend (ver comentarios en
// cada componente que la usa); para el resto, si el código no existe en la
// base, el backend responde 404 y aquí se devuelve una lista vacía en lugar
// de un error, así el componente puede caer a su lista local sin romperse.
@Injectable({ providedIn: 'root' })
export class CatalogosService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private esNavegador = isPlatformBrowser(inject(PLATFORM_ID));
  private apiUrl = 'https://localhost:7086/api/catalogos';

  private cache = new Map<string, ReturnType<typeof signal<CatalogoValor[]>>>();

  // Para la pantalla de mantenimiento: vuelve a pedir un catálogo (p. ej.
  // después de crear/editar/dar de baja un valor), aunque ya se haya
  // cargado antes.
  recargar(codigoTipo: string): void {
    if (!this.esNavegador) {
      return;
    }
    this.http
      .get<ApiResponse<CatalogoValor[]>>(`${this.apiUrl}/${codigoTipo}`)
      .pipe(
        map((resp) => resp.datos ?? []),
        catchError(() => of([] as CatalogoValor[])),
      )
      .subscribe((valores) => {
        let s = this.cache.get(codigoTipo);
        if (!s) {
          s = signal<CatalogoValor[]>([]);
          this.cache.set(codigoTipo, s);
        }
        s.set(valores);
      });
  }

  crearTipo(input: CatalogoTipoInput): Observable<unknown> {
    return this.http
      .post<ApiResponse<unknown>>(`${this.apiUrl}/tipos`, input)
      .pipe(catchError(this.errorService.handleError));
  }

  crearValor(codigoTipo: string, input: CatalogoValorInput): Observable<CatalogoValor> {
    return this.http.post<ApiResponse<CatalogoValor>>(`${this.apiUrl}/${codigoTipo}/valores`, input).pipe(
      map((resp) => resp.datos as CatalogoValor),
      tap(() => this.recargar(codigoTipo)),
      catchError(this.errorService.handleError),
    );
  }

  editarValor(codigoTipo: string, idValor: number, input: CatalogoValorInput): Observable<CatalogoValor> {
    return this.http.put<ApiResponse<CatalogoValor>>(`${this.apiUrl}/${codigoTipo}/valores/${idValor}`, input).pipe(
      map((resp) => resp.datos as CatalogoValor),
      tap(() => this.recargar(codigoTipo)),
      catchError(this.errorService.handleError),
    );
  }

  // Borrado lógico. El backend no tiene forma de reactivar un valor después
  // (GET /{codigoTipo} solo trae los activos): avisar bien antes de borrar.
  eliminarValor(codigoTipo: string, idValor: number): Observable<unknown> {
    return this.http.delete<ApiResponse<unknown>>(`${this.apiUrl}/${codigoTipo}/valores/${idValor}`).pipe(
      tap(() => this.recargar(codigoTipo)),
      catchError(this.errorService.handleError),
    );
  }

  // Lista reactiva de un catálogo (vacía mientras carga o si el código no existe).
  obtener(codigoTipo: string): Signal<CatalogoValor[]> {
    let s = this.cache.get(codigoTipo);
    if (!s) {
      s = signal<CatalogoValor[]>([]);
      this.cache.set(codigoTipo, s);
      if (this.esNavegador) {
        this.http
          .get<ApiResponse<CatalogoValor[]>>(`${this.apiUrl}/${codigoTipo}`)
          .pipe(
            map((resp) => resp.datos ?? []),
            catchError(() => of([] as CatalogoValor[])),
          )
          .subscribe((valores) => s!.set(valores));
      }
    }
    return s.asReadonly();
  }

  // Id real del valor con ese código dentro del catálogo (undefined si aún
  // no cargó o el código no existe: el llamador decide el valor por defecto).
  idPorCodigo(codigoTipo: string, codigoValor: string): number | undefined {
    return this.obtener(codigoTipo)().find((v) => v.codigo === codigoValor)?.id;
  }
}
