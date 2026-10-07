import { Injectable, computed, signal, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { OrdenDetalle, OrdenLaboratorio } from '../models';

export interface OrdenCompleta {
  orden: OrdenLaboratorio;
  detalles: OrdenDetalle[];
}

export interface TipoExamen {
  idTipoExamen: number;
  nombre: string;
  idCategoriaExamen: number;
  descripcion: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
}

export interface OpcionCatalogo {
  id: number;
  label: string;
}

export interface MedicoOpcion {
  id: number;
  nombre: string;
  especialidad: string;
}

type OrdenApi =
  | (OrdenLaboratorio & { detalles: OrdenDetalle[] })
  | { orden: OrdenLaboratorio; detalles: OrdenDetalle[] };

interface ApiResponse<T> {
  exito: boolean;
  mensaje: string;
  datos: T;
  errores: string[] | null;
}

@Injectable({ providedIn: 'root' })
export class LaboratorioService {
  private apiUrl = 'https://localhost:7086/api/laboratorio';
  private apiUrlTiposExamen = 'https://localhost:7086/api/tipos-examen';
  private apiUrlMedicos = 'https://localhost:7086/api/empleados/medicos';
  private apiUrlCatalogos = 'https://localhost:7086/api/catalogos';

  private registros = signal<OrdenCompleta[]>([]);
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
    console.error('❌ [LaboratorioService] No se encontró un JWT válido en localStorage');
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

    this.http.get<ApiResponse<OrdenApi[]>>(this.apiUrl, {
      headers: this.getHeaders(),
    }).subscribe({
      next: (resp) => {
        const lista = resp.datos ?? [];
        const completos = lista.map((o) => this.aPlano(o));
        console.log('🔍 [LaboratorioService] Órdenes cargadas:', completos.length);
        this.registros.set(completos);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ [LaboratorioService] Error al cargar:', err.status, err.statusText);
      },
    });
  }

  private aPlano(apiOrden: any): OrdenCompleta {
    if (
      apiOrden?.orden &&
      typeof apiOrden.orden === 'object' &&
      'idOrden' in apiOrden.orden
    ) {
      return {
        orden: apiOrden.orden as OrdenLaboratorio,
        detalles: apiOrden.detalles ?? [],
      };
    }
    const { detalles, ...orden } = apiOrden ?? {};
    return { orden: orden as OrdenLaboratorio, detalles: detalles ?? [] };
  }

  listar = computed(() =>
    this.registros()
      .filter((r) => r.orden.activo)
      .sort((a, b) => (b.orden.fechaOrden ?? '').localeCompare(a.orden.fechaOrden ?? '')),
  );

  obtener(id: number): OrdenCompleta | undefined {
    return this.registros().find((r) => r.orden.idOrden === id);
  }

  obtenerDesdeApi(id: number): Observable<OrdenCompleta> {
    return this.http.get<ApiResponse<OrdenApi>>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    }).pipe(
      map((resp) => this.aPlano(resp.datos)),
      tap((completo) => {
        this.registros.update((list) => {
          const existe = list.some((r) => r.orden.idOrden === id);
          return existe
            ? list.map((r) => (r.orden.idOrden === id ? completo : r))
            : [...list, completo];
        });
      }),
    );
  }

  guardar(registro: OrdenCompleta): Observable<ApiResponse<OrdenApi>> {
    const esNueva = registro.orden.idOrden === 0;

    const body = {
      idPaciente: registro.orden.idPaciente,
      idMedico: registro.orden.idMedico,
      idCita: registro.orden.idCita,
      fechaOrden: registro.orden.fechaOrden,
      idPrioridad: registro.orden.idPrioridad,
      idEstadoOrden: registro.orden.idEstadoOrden,
      notas: registro.orden.notas,
      detalles: registro.detalles.map((d) => ({
        idOrdenDetalle: d.idOrdenDetalle,
        idTipoExamen: d.idTipoExamen,
      })),
    };

    if (esNueva) {
      return this.http.post<ApiResponse<OrdenApi>>(this.apiUrl, body, {
        headers: this.getHeaders(),
      }).pipe(
        tap((resp) => {
          const completo = this.aPlano(resp.datos);
          this.registros.update((list) => [...list, completo]);
        }),
      );
    }

    return this.http.put<ApiResponse<OrdenApi>>(
      `${this.apiUrl}/${registro.orden.idOrden}`,
      body,
      { headers: this.getHeaders() },
    ).pipe(
      tap((resp) => {
        const completo = this.aPlano(resp.datos);
        this.registros.update((list) =>
          list.map((r) =>
            r.orden.idOrden === completo.orden.idOrden ? completo : r,
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
            r.orden.idOrden === id
              ? { ...r, orden: { ...r.orden, activo: false } }
              : r,
          ),
        );
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [LaboratorioService] No se pudo eliminar:', err.status),
    });
  }

  // =============================================================
  // TIPOS DE EXAMEN
  // =============================================================

  RetornarTiposExamen(): Observable<TipoExamen[]> {
    return this.http.get<ApiResponse<TipoExamen[]>>(this.apiUrlTiposExamen, {
      headers: this.getHeaders(),
    }).pipe(
      map((resp) => (resp.datos ?? []).filter((t) => t.activo !== false)),
      tap((tipos) => {
        console.log('🔍 [LaboratorioService] Tipos de examen cargados:', tipos.length);
      }),
    );
  }

  // =============================================================
  // MÉDICOS
  // =============================================================

  RetornarMedicos(): Observable<MedicoOpcion[]> {
    return this.http.get<ApiResponse<any[]>>(this.apiUrlMedicos, {
      headers: this.getHeaders(),
    }).pipe(
      map((resp) =>
        (resp.datos ?? []).map((m: any) => ({
          id: m.idEmpleado ?? m.id_empleado,
          nombre:
            m.nombreCompleto ??
            m.nombre_completo ??
            [m.primerNombre ?? m.primer_nombre, m.primerApellido ?? m.primer_apellido]
              .filter(Boolean)
              .join(' '),
          especialidad: m.especialidad?.nombre ?? m.especialidad ?? '',
        })),
      ),
      tap((medicos) =>
        console.log('🔍 [LaboratorioService] Médicos cargados:', medicos.length),
      ),
    );
  }

  // =============================================================
  // CATÁLOGOS GENÉRICOS (prioridad, estado, etc.)
  // =============================================================

  private retornarCatalogo(codigoTipo: string): Observable<OpcionCatalogo[]> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.apiUrlCatalogos}/${codigoTipo}`,
      { headers: this.getHeaders() },
    ).pipe(
      map((resp) =>
        (resp.datos ?? []).map((c: any) => ({
          id: c.id ?? c.idValorCatalogo ?? c.id_valor_catalogo,
          label: c.nombre,
        })),
      ),
    );
  }

  RetornarPrioridades(): Observable<OpcionCatalogo[]> {
    return this.retornarCatalogo('PRIORIDAD_ORDEN').pipe(
      tap((items) =>
        console.log('🔍 [LaboratorioService] Prioridades cargadas:', items.length, items),
      ),
    );
  }

  RetornarEstadosOrden(): Observable<OpcionCatalogo[]> {
    return this.retornarCatalogo('ESTADO_ORDEN_LABORATORIO').pipe(
      tap((items) =>
        console.log('🔍 [LaboratorioService] Estados cargados:', items.length, items),
      ),
    );
  }
}
