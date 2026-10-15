import { environment } from '../../environments/environment';
import { Injectable, computed, signal, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, map, tap, shareReplay, forkJoin } from 'rxjs';

export interface ConsentimientoInformado {
  idConsentimiento: number;
  idPaciente: number;
  idTipoConsentimiento: number;
  idTratamiento: number | null;
  idMedicoResponsable: number | null;
  idTestigo: number | null;
  fechaFirma: string | null;
  firmaDigitalHash: string | null;
  firmaDigitalUrl: string | null;
  idEstadoConsentimiento: number;
  activo: boolean;
  fechaCreacion: string;
  fechaModificacion: string | null;
  idUsuarioCreacion: number | null;
  idUsuarioModificacion: number | null;
}

export interface CompromisoPago {
  consentimiento: ConsentimientoInformado;
  nombreResponsable: string;
  idParentescoResponsable: number;
  telefonoResponsable: string;
}

export interface OpcionCatalogo {
  id: number;
  label: string;
  codigo?: string;
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
export class CompromisosPagoService {
  private apiUrl = `${environment.apiUrl}/api/compromisos-pago`;
  private apiUrlMedicos = `${environment.apiUrl}/api/empleados/medicos`;
  private apiUrlCatalogos = `${environment.apiUrl}/api/catalogos`;
  private apiUrlBitacora = `${environment.apiUrl}/api/bitacora-auditoria`;
  private apiUrlUsuarios = `${environment.apiUrl}/api/Usuarios`;

  private registros = signal<CompromisoPago[]>([]);
  private esNavegador: boolean;

  private catalogosCache = new Map<string, OpcionCatalogo[]>();

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
    console.error('❌ [CompromisosPago] No se encontró un JWT válido en localStorage');
    return null;
  }

  /**
   * ✅ Devuelve el id del usuario actual desde localStorage.
   * Lo usamos para setear idUsuarioModificacion en el signal local.
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

  // =============================================================
  // RESOLUCIÓN DE IDs POR CÓDIGO
  // =============================================================

  private retornarCatalogoCacheado(codigoTipo: string): Observable<OpcionCatalogo[]> {
    const cache = this.catalogosCache.get(codigoTipo);
    if (cache) {
      return new Observable((obs) => {
        obs.next(cache);
        obs.complete();
      });
    }
    return this.http.get<ApiResponse<any[]>>(
      `${this.apiUrlCatalogos}/${codigoTipo}`,
      { headers: this.getHeaders() },
    ).pipe(
      map((resp) =>
        (resp.datos ?? []).map((c: any) => ({
          id: c.id ?? c.idValorCatalogo ?? c.id_valor_catalogo,
          label: c.nombre ?? c.label ?? '',
          codigo: c.codigo ?? '',
        })),
      ),
      tap((items) => this.catalogosCache.set(codigoTipo, items)),
      shareReplay(1),
    );
  }

  idPorCodigo(codigoTipo: string, codigoValor: string): number | null {
    const items = this.catalogosCache.get(codigoTipo);
    if (!items) return null;
    const item = items.find((x) => x.codigo === codigoValor);
    return item?.id ?? null;
  }

  opcionPorCodigo(codigoTipo: string, codigoValor: string): OpcionCatalogo | null {
    const items = this.catalogosCache.get(codigoTipo);
    if (!items) return null;
    return items.find((x) => x.codigo === codigoValor) ?? null;
  }

  precargarCatalogos(): void {
    this.retornarCatalogoCacheado('TIPO_CONSENTIMIENTO').subscribe();
    this.retornarCatalogoCacheado('ESTADO_CONSENTIMIENTO').subscribe();
    this.retornarCatalogoCacheado('PARENTESCO').subscribe();
  }

  // =============================================================
  // CRUD PRINCIPAL
  // =============================================================

  private cargar(): void {
    if (!this.esNavegador) return;

    forkJoin({
      activos: this.http.get<ApiResponse<any[]>>(this.apiUrl, {
        headers: this.getHeaders(),
      }),
      eliminados: this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/eliminados`, {
        headers: this.getHeaders(),
      }),
    }).subscribe({
      next: ({ activos, eliminados }) => {
        const listaActivos = (activos.datos ?? []).map((c) => this.aPlano(c));
        const listaEliminados = (eliminados.datos ?? []).map((c) => this.aPlano(c));
        this.registros.set([...listaActivos, ...listaEliminados]);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ [CompromisosPago] Error al cargar:', err.status, err.statusText);
      },
    });
  }

  private aPlano(item: any): CompromisoPago {
    if (item?.consentimiento && typeof item.consentimiento === 'object') {
      return {
        consentimiento: item.consentimiento as ConsentimientoInformado,
        nombreResponsable: item.nombreResponsable ?? '',
        idParentescoResponsable: item.idParentescoResponsable ?? 0,
        telefonoResponsable: item.telefonoResponsable ?? '',
      };
    }
    const { nombreResponsable, idParentescoResponsable, telefonoResponsable, ...resto } = item ?? {};
    return {
      consentimiento: resto as ConsentimientoInformado,
      nombreResponsable: nombreResponsable ?? '',
      idParentescoResponsable: idParentescoResponsable ?? 0,
      telefonoResponsable: telefonoResponsable ?? '',
    };
  }

  listar = computed(() =>
    this.registros()
      .filter((c) => c.consentimiento.activo)
      .sort((a, b) =>
        (b.consentimiento.fechaCreacion ?? '').localeCompare(a.consentimiento.fechaCreacion ?? ''),
      ),
  );

  listarInactivos = computed(() =>
    this.registros()
      .filter((c) => !c.consentimiento.activo)
      .sort((a, b) =>
        (b.consentimiento.fechaCreacion ?? '').localeCompare(a.consentimiento.fechaCreacion ?? ''),
      ),
  );

  obtener(id: number): CompromisoPago | undefined {
    return this.registros().find((c) => c.consentimiento.idConsentimiento === id);
  }

  obtenerDesdeApi(id: number): Observable<CompromisoPago> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    }).pipe(
      map((resp) => this.aPlano(resp.datos)),
      tap((item) => {
        this.registros.update((list) => {
          const existe = list.some((c) => c.consentimiento.idConsentimiento === id);
          return existe
            ? list.map((c) => (c.consentimiento.idConsentimiento === id ? item : c))
            : [...list, item];
        });
      }),
    );
  }

  guardar(registro: CompromisoPago): Observable<ApiResponse<any>> {
    const esNuevo = registro.consentimiento.idConsentimiento === 0;

    const body = {
      idPaciente: registro.consentimiento.idPaciente,
      idTipoConsentimiento: registro.consentimiento.idTipoConsentimiento,
      idTratamiento: registro.consentimiento.idTratamiento,
      idMedicoResponsable: registro.consentimiento.idMedicoResponsable,
      idTestigo: registro.consentimiento.idTestigo,
      fechaFirma: registro.consentimiento.fechaFirma,
      firmaDigitalHash: registro.consentimiento.firmaDigitalHash,
      firmaDigitalUrl: registro.consentimiento.firmaDigitalUrl,
      idEstadoConsentimiento: registro.consentimiento.idEstadoConsentimiento,
      nombreResponsable: registro.nombreResponsable,
      idParentescoResponsable: registro.idParentescoResponsable,
      telefonoResponsable: registro.telefonoResponsable,
    };

    if (esNuevo) {
      return this.http.post<ApiResponse<any>>(this.apiUrl, body, {
        headers: this.getHeaders(),
      }).pipe(
        tap((resp) => {
          this.registros.update((list) => [...list, this.aPlano(resp.datos)]);
        }),
      );
    }

    return this.http.put<ApiResponse<any>>(
      `${this.apiUrl}/${registro.consentimiento.idConsentimiento}`,
      body,
      { headers: this.getHeaders() },
    ).pipe(
      tap((resp) => {
        const item = this.aPlano(resp.datos);
        this.registros.update((list) =>
          list.map((c) =>
            c.consentimiento.idConsentimiento === item.consentimiento.idConsentimiento ? item : c,
          ),
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
            c.consentimiento.idConsentimiento === id
              ? {
                  ...c,
                  consentimiento: {
                    ...c.consentimiento,
                    activo: false,
                    fechaModificacion: ahora,
                    idUsuarioModificacion: idUsuarioActual,
                  },
                }
              : c,
          ),
        );
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CompromisosPago] No se pudo eliminar:', err.status),
    });
  }

  /**
   * ✅ Reactiva un compromiso eliminado.
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
            c.consentimiento.idConsentimiento === id
              ? { ...c, consentimiento: { ...c.consentimiento, activo: true } }
              : c,
          ),
        );
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
    );
  }

  // =============================================================
  // CATÁLOGOS GENÉRICOS
  // =============================================================

  RetornarParentescos(): Observable<OpcionCatalogo[]> {
    return this.retornarCatalogoCacheado('PARENTESCO');
  }

  RetornarEstadosConsentimiento(): Observable<OpcionCatalogo[]> {
    return this.retornarCatalogoCacheado('ESTADO_CONSENTIMIENTO');
  }

  RetornarTiposConsentimiento(): Observable<OpcionCatalogo[]> {
    return this.retornarCatalogoCacheado('TIPO_CONSENTIMIENTO');
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