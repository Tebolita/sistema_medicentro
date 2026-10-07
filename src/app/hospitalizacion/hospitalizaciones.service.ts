import { Injectable, computed, signal, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { Hospitalizacion, OrdenMedicaHospitalizacion } from '../models';
import {
  CamaOpcion,
  ESTADO_CAMA_LIBRE,
  ESTADO_CAMA_OCUPADA,
} from './hospitalizacion-catalogos';

export interface HospitalizacionCompleta {
  hospitalizacion: Hospitalizacion;
  ordenes: OrdenMedicaHospitalizacion[];
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

export interface UsuarioOpcion {
  id: number;
  nombre: string;
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
  private apiUrlCamas = 'https://localhost:7086/api/Camas';
  private apiUrlHabitaciones = 'https://localhost:7086/api/Habitaciones';
  private apiUrlMedicos = 'https://localhost:7086/api/empleados/medicos';
  private apiUrlCatalogos = 'https://localhost:7086/api/catalogos';
  private apiUrlBitacora = 'https://localhost:7086/api/bitacora-auditoria';
  private apiUrlUsuarios = 'https://localhost:7086/api/Usuarios';

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
            ? list.map((r) => (r.hospitalizacion.idHospitalizacion === id ? item : r))
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

  // =============================================================
  // ÓRDENES MÉDICAS
  // =============================================================

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

  actualizarOrden(
    idHospitalizacion: number,
    idOrdenMedica: number,
    orden: { idMedico: number; idTipoOrden: number; fechaOrden: string; descripcion: string },
  ): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${this.apiUrl}/${idHospitalizacion}/ordenes/${idOrdenMedica}`,
      orden,
      { headers: this.getHeaders() },
    ).pipe(
      tap((resp) => {
        const actualizada = resp.datos ?? {};
        this.registros.update((list) =>
          list.map((r) =>
            r.hospitalizacion.idHospitalizacion === idHospitalizacion
              ? {
                  ...r,
                  ordenes: r.ordenes.map((o) =>
                    o.idOrdenMedica === idOrdenMedica
                      ? { ...o, ...actualizada, idOrdenMedica: o.idOrdenMedica }
                      : o,
                  ),
                }
              : r,
          ),
        );
      }),
    );
  }

  eliminarOrden(idHospitalizacion: number, idOrdenMedica: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(
      `${this.apiUrl}/${idHospitalizacion}/ordenes/${idOrdenMedica}`,
      { headers: this.getHeaders() },
    ).pipe(
      tap(() => {
        this.registros.update((list) =>
          list.map((r) =>
            r.hospitalizacion.idHospitalizacion === idHospitalizacion
              ? { ...r, ordenes: r.ordenes.filter((o) => o.idOrdenMedica !== idOrdenMedica) }
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

  // =============================================================
  // CAMAS
  // =============================================================

  RetornarCamas(): Observable<CamaOpcion[]> {
    return this.http.get<ApiResponse<any[]>>(this.apiUrlHabitaciones, {
      headers: this.getHeaders(),
    }).pipe(
      map((resp) => {
        const items = resp.datos ?? [];
        const camas: CamaOpcion[] = [];

        for (const item of items) {
          const hab = item?.habitacion ?? {};
          const camasDeHab = item?.camas ?? [];

          if (!Array.isArray(camasDeHab)) continue;

          const numeroHab =
            hab.numero ?? hab.numeroHabitacion ?? hab.numero_habitacion ?? '?';

          for (const c of camasDeHab) {
            if (c?.activo === false) continue;

            camas.push({
              id: Number(c.idCama),
              label: `Habitación ${numeroHab} · Cama ${c.numeroCama}`,
              idTipoHabitacion: Number(hab.idTipoHabitacion ?? 0),
              idHabitacion: Number(c.idHabitacion ?? hab.idHabitacion),
              numeroCama: String(c.numeroCama),
              idEstadoCama: Number(c.idEstadoCama),
            });
          }
        }

        console.log('🔍 [Hospitalizaciones] Camas recibidas:', camas.length);
        return camas;
      }),
    );
  }

  RetornarCamasLibres(): Observable<CamaOpcion[]> {
    return this.RetornarCamas().pipe(
      map((camas) => camas.filter((c) => c.idEstadoCama === ESTADO_CAMA_LIBRE)),
      tap((camas) => console.log('🔍 [Hospitalizaciones] Camas libres:', camas.length)),
    );
  }

  actualizarEstadoCama(cama: CamaOpcion, idEstadoCama: number): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${this.apiUrlHabitaciones}/${cama.idHabitacion}/camas/${cama.id}`,
      {
        numeroCama: cama.numeroCama,
        idEstadoCama,
      },
      { headers: this.getHeaders() },
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
        console.log('🔍 [Hospitalizaciones] Médicos cargados:', medicos.length),
      ),
    );
  }

  // =============================================================
  // CATÁLOGOS GENÉRICOS
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

  RetornarEstadosHospitalizacion(): Observable<OpcionCatalogo[]> {
    return this.retornarCatalogo('ESTADO_HOSPITALIZACION').pipe(
      tap((items) =>
        console.log('🔍 [Hospitalizaciones] Estados cargados:', items.length, items),
      ),
    );
  }

  RetornarTiposOrden(): Observable<OpcionCatalogo[]> {
    return this.retornarCatalogo('TIPO_ORDEN_HOSPITALIZACION').pipe(
      tap((items) =>
        console.log('🔍 [Hospitalizaciones] Tipos de orden cargados:', items.length, items),
      ),
    );
  }

  // =============================================================
  // BITÁCORA DE AUDITORÍA
  // =============================================================

  /**
   * Trae el historial de auditoría de un registro específico.
   */
  RetornarBitacoraPorRegistro(
    tablaAfectada: string,
    idRegistro: number,
  ): Observable<BitacoraItem[]> {
    return this.http.get<ApiResponse<BitacoraItem[]>>(
      `${this.apiUrlBitacora}?tablaAfectada=${encodeURIComponent(tablaAfectada)}`,
      { headers: this.getHeaders() },
    ).pipe(
      map((resp) =>
        (resp.datos ?? [])
          .filter((b) => b.idRegistroAfectado === idRegistro)
          .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora)),
      ),
      tap((items) =>
        console.log(
          `🔍 [Hospitalizaciones] Bitácora de ${tablaAfectada}#${idRegistro}:`,
          items.length,
        ),
      ),
    );
  }

  /**
   * Trae TODA la bitácora de una tabla (sin filtrar por id de registro).
   * Se usa para el historial general del módulo.
   */
  RetornarBitacoraGeneral(tablaAfectada: string): Observable<BitacoraItem[]> {
    return this.http.get<ApiResponse<BitacoraItem[]>>(
      `${this.apiUrlBitacora}?tablaAfectada=${encodeURIComponent(tablaAfectada)}`,
      { headers: this.getHeaders() },
    ).pipe(
      map((resp) => (resp.datos ?? []).sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))),
      tap((items) =>
        console.log(`🔍 [Hospitalizaciones] Bitácora general de ${tablaAfectada}:`, items.length),
      ),
    );
  }

  /**
   * Trae todos los usuarios (para mostrar el nombre del que hizo el cambio).
   */
  RetornarUsuarios(): Observable<UsuarioOpcion[]> {
    return this.http.get<ApiResponse<any[]>>(this.apiUrlUsuarios, {
      headers: this.getHeaders(),
    }).pipe(
      map((resp) =>
        (resp.datos ?? []).map((u: any) => ({
          id: u.idUsuario ?? u.id_usuario,
          nombre: u.nombreUsuario ?? u.nombre_usuario ?? '',
        })),
      ),
      tap((items) =>
        console.log('🔍 [Hospitalizaciones] Usuarios cargados:', items.length),
      ),
    );
  }
}