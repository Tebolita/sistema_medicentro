import { Injectable, computed, signal, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { Hospitalizacion, OrdenMedicaHospitalizacion } from '../models';

export interface HospitalizacionCompleta {
  hospitalizacion: Hospitalizacion;
  ordenes: OrdenMedicaHospitalizacion[];
}

interface ApiResponse<T> {
  exito: boolean;
  mensaje: string;
  datos: T;
  errores: string[] | null;
}

@Injectable({ providedIn: 'root' })
export class HospitalizacionesService {
  private apiUrl = 'https://localhost:7086/api/Hospitalizaciones';

  private registros = signal<HospitalizacionCompleta[]>([]);
  private esNavegador: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object,
  ) {
    this.esNavegador = isPlatformBrowser(platformId);
    if (this.esNavegador) {
      this.cargar();
    }
  }

  private obtenerToken(): string | null {
    if (!this.esNavegador) return null;
    const posibles = ['access_token', 'token', 'accessToken', 'jwt'];
    for (const key of posibles) {
      const valor = localStorage.getItem(key);
      if (!valor) continue;
      let limpio: any = valor.trim();
      if (typeof limpio === 'string' && limpio.startsWith('"') && limpio.endsWith('"')) {
        try { limpio = JSON.parse(limpio); } catch { /* ignorar */ }
      }
      if (typeof limpio === 'object' && limpio !== null) {
        limpio = limpio.token || limpio.access_token || limpio.accessToken || '';
      }
      limpio = String(limpio).trim();
      if (limpio.toLowerCase().startsWith('bearer ')) {
        limpio = limpio.slice(7).trim();
      }
      if (limpio.split('.').length === 3 && limpio.length > 40) {
        return limpio;
      }
    }
    console.error('❌ [Hospitalizaciones] No se encontró un JWT válido en localStorage');
    return null;
  }

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    });
    const token = this.obtenerToken();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  private cargar(): void {
    if (!this.esNavegador) return;
    this.http.get<ApiResponse<any[]>>(this.apiUrl, {
      headers: this.getHeaders(),
    }).subscribe({
      next: (resp) => {
        const lista = (resp.datos ?? []).map((r) => this.aCompleta(r));
        console.log('🔍 [Hospitalizaciones] Registros cargados:', lista.length);
        this.registros.set(lista);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ [Hospitalizaciones] Error al cargar:', err.status, err.statusText);
      },
    });
  }

  private aCompleta(item: any): HospitalizacionCompleta {
    if (item?.hospitalizacion && typeof item.hospitalizacion === 'object') {
      return {
        hospitalizacion: item.hospitalizacion as Hospitalizacion,
        ordenes: item.ordenes ?? [],
      };
    }
    const { ordenes, ...resto } = item ?? {};
    return {
      hospitalizacion: resto as Hospitalizacion,
      ordenes: ordenes ?? [],
    };
  }

  listar = computed(() =>
    this.registros()
      .filter((r) => r.hospitalizacion.activo)
      .sort((a, b) =>
        (b.hospitalizacion.fechaIngreso ?? '').localeCompare(a.hospitalizacion.fechaIngreso ?? ''),
      ),
  );

  activas = computed(() =>
    this.listar().filter((r) => r.hospitalizacion.idEstadoHospitalizacion === 65),
  );

  obtener(id: number): HospitalizacionCompleta | undefined {
    return this.registros().find((r) => r.hospitalizacion.idHospitalizacion === id);
  }

  obtenerDesdeApi(id: number): Observable<HospitalizacionCompleta> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    }).pipe(
      map((resp) => this.aCompleta(resp.datos)),
      tap((item) => {
        this.registros.update((list) => {
          const existe = list.some((r) => r.hospitalizacion.idHospitalizacion === id);
          return existe
            ? list.map((r) =>
                r.hospitalizacion.idHospitalizacion === id ? item : r,
              )
            : [...list, item];
        });
      }),
    );
  }

  guardar(registro: Hospitalizacion): Observable<ApiResponse<any>> {
    const esNueva = registro.idHospitalizacion === 0;

    const body = {
      idPaciente: registro.idPaciente,
      idCama: registro.idCama,
      idMedicoResponsable: registro.idMedicoResponsable,
      fechaIngreso: registro.fechaIngreso,
      fechaEgreso: registro.fechaEgreso,
      motivoIngreso: registro.motivoIngreso,
      diagnosticoEgreso: registro.diagnosticoEgreso,
      idEstadoHospitalizacion: registro.idEstadoHospitalizacion,
    };

    if (esNueva) {
      return this.http.post<ApiResponse<any>>(this.apiUrl, body, {
        headers: this.getHeaders(),
      }).pipe(
        tap((resp) => {
          this.registros.update((list) => [...list, this.aCompleta(resp.datos)]);
        }),
      );
    }

    return this.http.put<ApiResponse<any>>(
      `${this.apiUrl}/${registro.idHospitalizacion}`,
      body,
      { headers: this.getHeaders() },
    ).pipe(
      tap((resp) => {
        const item = this.aCompleta(resp.datos);
        this.registros.update((list) =>
          list.map((r) =>
            r.hospitalizacion.idHospitalizacion === item.hospitalizacion.idHospitalizacion
              ? item
              : r,
          ),
        );
      }),
    );
  }

  /**
   * Carga las órdenes médicas de una hospitalización desde
   * GET /api/Hospitalizaciones/{id}/ordenes
   * y las adjunta al signal local.
   */
  RetornarOrdenes(idHospitalizacion: number): Observable<OrdenMedicaHospitalizacion[]> {
    return this.http.get<ApiResponse<OrdenMedicaHospitalizacion[]>>(
      `${this.apiUrl}/${idHospitalizacion}/ordenes`,
      { headers: this.getHeaders() },
    ).pipe(
      map((resp) => resp.datos ?? []),
      tap((ordenes) => {
        console.log('🔍 [Hospitalizaciones] Órdenes cargadas:', ordenes.length);
        this.registros.update((list) =>
          list.map((r) =>
            r.hospitalizacion.idHospitalizacion === idHospitalizacion
              ? { ...r, ordenes }
              : r,
          ),
        );
      }),
    );
  }

  agregarOrden(
    idHospitalizacion: number,
    orden: Omit<OrdenMedicaHospitalizacion, 'idOrdenMedica' | 'idHospitalizacion' | 'activo'>,
  ): Observable<ApiResponse<any>> {
    const body = {
      idMedico: orden.idMedico,
      idTipoOrden: orden.idTipoOrden,
      fechaOrden: orden.fechaOrden,
      descripcion: orden.descripcion,
    };

    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/${idHospitalizacion}/ordenes`,
      body,
      { headers: this.getHeaders() },
    ).pipe(
      tap((resp) => {
        this.registros.update((list) =>
          list.map((r) =>
            r.hospitalizacion.idHospitalizacion === idHospitalizacion
              ? { ...r, ordenes: [...r.ordenes, resp.datos] }
              : r,
          ),
        );
      }),
    );
  }

  eliminar(id: number): void {
    this.http.delete<ApiResponse<null>>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    }).subscribe({
      next: () => {
        this.registros.update((list) =>
          list.map((r) =>
            r.hospitalizacion.idHospitalizacion === id
              ? { ...r, hospitalizacion: { ...r.hospitalizacion, activo: false } }
              : r,
          ),
        );
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [Hospitalizaciones] No se pudo eliminar:', err.status),
    });
  }
}