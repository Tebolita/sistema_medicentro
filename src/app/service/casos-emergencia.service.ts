import { environment } from '../../environments/environment';
import { Injectable, computed, signal, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, map, tap, forkJoin, of } from 'rxjs';

export interface CasoEmergencia {
  idCaso: number;
  idPaciente: number | null;
  nombrePaciente: string;
  idMedico: number | null;
  idSala: number | null;
  // La genera el backend solo si hay paciente registrado + médico asignado
  // (ver SOLICITUD_MOTOR_CONSULTAS.md, sección 4); no se manda al guardar.
  idCita: number | null;
  idNivelTriage: number;
  idEstadoCaso: number;
  motivo: string;
  horaLlegada: string;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion?: number | null;
  idUsuarioModificacion?: number | null;
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
export class CasosEmergenciaService {
  private apiUrl = `${environment.apiUrl}/api/casos-emergencia`;
  private apiUrlMedicos = `${environment.apiUrl}/api/empleados/medicos`;
  private apiUrlCatalogos = `${environment.apiUrl}/api/catalogos`;
  private apiUrlBitacora = `${environment.apiUrl}/api/bitacora-auditoria`;
  private apiUrlUsuarios = `${environment.apiUrl}/api/Usuarios`;

  private registros = signal<CasoEmergencia[]>([]);
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
    console.error('❌ [CasosEmergencia] No se encontró un JWT válido en localStorage');
    return null;
  }

  /**
   * ✅ Devuelve el id del usuario actual desde localStorage.
   * Lo usamos para setear idUsuarioModificacion en el signal local
   * (así la UI muestra el nombre correcto sin esperar a recargar).
   */
  private obtenerIdUsuarioActual(): number | null {
    if (!this.esNavegador) return null;
    const valor = localStorage.getItem('id_usuario');
    if (!valor) return null;
    const id = Number(valor);
    return isNaN(id) ? null : id;
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

  /**
   * ✅ Carga activos Y eliminados en paralelo.
   */
  private cargar(): void {
    if (!this.esNavegador) return;

    forkJoin({
      activos: this.http.get<ApiResponse<CasoEmergencia[]>>(this.apiUrl, {
        headers: this.getHeaders(),
      }),
      eliminados: this.http.get<ApiResponse<CasoEmergencia[]>>(`${this.apiUrl}/eliminados`, {
        headers: this.getHeaders(),
      }),
    }).subscribe({
      next: ({ activos, eliminados }) => {
        const listaActivos = activos.datos ?? [];
        const listaEliminados = eliminados.datos ?? [];
        this.registros.set([...listaActivos, ...listaEliminados]);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ [CasosEmergencia] Error al cargar:', err.status, err.statusText);
      },
    });
  }

  listar = computed(() =>
    this.registros()
      .filter((c) => c.activo)
      .sort((a, b) => (b.horaLlegada ?? '').localeCompare(a.horaLlegada ?? '')),
  );

  listarInactivos = computed(() =>
    this.registros()
      .filter((c) => !c.activo)
      .sort((a, b) => (b.horaLlegada ?? '').localeCompare(a.horaLlegada ?? '')),
  );

  obtener(id: number): CasoEmergencia | undefined {
    return this.registros().find((c) => c.idCaso === id);
  }

  obtenerDesdeApi(id: number): Observable<CasoEmergencia> {
    return this.http.get<ApiResponse<CasoEmergencia>>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    }).pipe(
      map((resp) => resp.datos),
      tap((caso) => {
        this.registros.update((list) => {
          const existe = list.some((c) => c.idCaso === id);
          return existe ? list.map((c) => (c.idCaso === id ? caso : c)) : [...list, caso];
        });
      }),
    );
  }

  guardar(registro: CasoEmergencia): Observable<ApiResponse<CasoEmergencia>> {
    const esNuevo = registro.idCaso === 0;

    const body = {
      idPaciente: registro.idPaciente,
      nombrePaciente: registro.nombrePaciente || null,
      idMedico: registro.idMedico,
      idSala: registro.idSala,
      idNivelTriage: registro.idNivelTriage,
      idEstadoCaso: registro.idEstadoCaso,
      motivo: registro.motivo,
      horaLlegada: registro.horaLlegada,
    };

    if (esNuevo) {
      return this.http.post<ApiResponse<CasoEmergencia>>(this.apiUrl, body, {
        headers: this.getHeaders(),
      }).pipe(
        tap((resp) => {
          this.registros.update((list) => [...list, resp.datos]);
        }),
      );
    }

    return this.http.put<ApiResponse<CasoEmergencia>>(`${this.apiUrl}/${registro.idCaso}`, body, {
      headers: this.getHeaders(),
    }).pipe(
      tap((resp) => {
        this.registros.update((list) =>
          list.map((c) => (c.idCaso === resp.datos.idCaso ? resp.datos : c)),
        );
      }),
    );
  }

  /**
   * ✅ Elimina (baja lógica).
   * Actualiza el signal local con:
   *   - activo: false
   *   - fechaModificacion: ahora (UTC)
   *   - idUsuarioModificacion: id del usuario actual
   *
   * Con esto la UI muestra "por [usuario]" SIN esperar a recargar.
   */
  eliminar(id: number): void {
    this.http.delete<ApiResponse<null>>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    }).subscribe({
      next: () => {
        const ahora = new Date().toISOString();
        const idUsuarioActual = this.obtenerIdUsuarioActual();

        this.registros.update((list) =>
          list.map((c) =>
            c.idCaso === id
              ? {
                  ...c,
                  activo: false,
                  fechaModificacion: ahora,
                  idUsuarioModificacion: idUsuarioActual,
                }
              : c,
          ),
        );
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CasosEmergencia] No se pudo eliminar:', err.status),
    });
  }

  /**
   * ✅ Reactiva un caso eliminado.
   * Endpoint: PUT /api/casos-emergencia/{id}/reactivar
   */
  reactivar(id: number): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${this.apiUrl}/${id}/reactivar`,
      {},
      { headers: this.getHeaders() },
    ).pipe(
      tap(() => {
        this.registros.update((list) =>
          list.map((c) =>
            c.idCaso === id ? { ...c, activo: true } : c,
          ),
        );
      }),
    );
  }

  // =============================================================
  // MÉDICOS
  // =============================================================

  RetornarMedicos(): Observable<MedicoOpcion[]> {
    // En SSR no hay token todavía (ver obtenerToken): pedir esto sin
    // Authorization solo saca un 401 del backend y dispara el toast de
    // error en el HTML prerenderizado. Se omite y el cliente, ya
    // hidratado con el token real, lo vuelve a pedir solo.
    if (!this.esNavegador) return of([]);
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
    );
  }

  // =============================================================
  // CATÁLOGOS GENÉRICOS
  // =============================================================

  private retornarCatalogo(codigoTipo: string): Observable<OpcionCatalogo[]> {
    if (!this.esNavegador) return of([]);
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

  RetornarNivelesTriage(): Observable<OpcionCatalogo[]> {
    return this.retornarCatalogo('NIVEL_TRIAGE');
  }

  RetornarEstadosCaso(): Observable<OpcionCatalogo[]> {
    return this.retornarCatalogo('ESTADO_CASO_EMERGENCIA');
  }

  // =============================================================
  // BITÁCORA DE AUDITORÍA
  // =============================================================

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
    );
  }

  RetornarBitacoraGeneral(tablaAfectada: string): Observable<BitacoraItem[]> {
    return this.http.get<ApiResponse<BitacoraItem[]>>(
      `${this.apiUrlBitacora}?tablaAfectada=${encodeURIComponent(tablaAfectada)}`,
      { headers: this.getHeaders() },
    ).pipe(
      map((resp) => (resp.datos ?? []).sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))),
    );
  }

  RetornarUsuarios(): Observable<UsuarioOpcion[]> {
    if (!this.esNavegador) return of([]);
    return this.http.get<ApiResponse<any[]>>(this.apiUrlUsuarios, {
      headers: this.getHeaders(),
    }).pipe(
      map((resp) =>
        (resp.datos ?? []).map((u: any) => ({
          id: u.idUsuario ?? u.id_usuario,
          nombre: u.nombreUsuario ?? u.nombre_usuario ?? '',
        })),
      ),
    );
  }
}