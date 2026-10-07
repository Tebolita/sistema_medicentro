import { Injectable, computed, signal, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

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
}

export interface MedicoOpcion {
  id: number;
  nombre: string;
  especialidad: string;
}

interface ApiResponse<T> {
  exito: boolean;
  mensaje: string;
  datos: T;
  errores: string[] | null;
}

@Injectable({ providedIn: 'root' })
export class CompromisosPagoService {
  private apiUrl = 'https://localhost:7086/api/compromisos-pago';
  private apiUrlMedicos = 'https://localhost:7086/api/empleados/medicos';
  private apiUrlCatalogos = 'https://localhost:7086/api/catalogos';

  private registros = signal<CompromisoPago[]>([]);
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
    console.error('❌ [CompromisosPago] No se encontró un JWT válido en localStorage');
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
        const lista = (resp.datos ?? []).map((c) => this.aPlano(c));
        console.log('🔍 [CompromisosPago] Compromisos cargados:', lista.length);
        this.registros.set(lista);
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

  eliminar(id: number): void {
    this.http.delete<ApiResponse<null>>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    }).subscribe({
      next: () => {
        this.registros.update((list) =>
          list.map((c) =>
            c.consentimiento.idConsentimiento === id
              ? { ...c, consentimiento: { ...c.consentimiento, activo: false } }
              : c,
          ),
        );
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CompromisosPago] No se pudo eliminar:', err.status),
    });
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
        console.log('🔍 [CompromisosPago] Médicos cargados:', medicos.length),
      ),
    );
  }

  // =============================================================
  // CATÁLOGOS GENÉRICOS (parentesco, estado consentimiento)
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

  RetornarParentescos(): Observable<OpcionCatalogo[]> {
    return this.retornarCatalogo('PARENTESCO').pipe(
      tap((items) =>
        console.log('🔍 [CompromisosPago] Parentescos cargados:', items.length, items),
      ),
    );
  }

  RetornarEstadosConsentimiento(): Observable<OpcionCatalogo[]> {
    return this.retornarCatalogo('ESTADO_CONSENTIMIENTO').pipe(
      tap((items) =>
        console.log('🔍 [CompromisosPago] Estados consentimiento cargados:', items.length, items),
      ),
    );
  }
}