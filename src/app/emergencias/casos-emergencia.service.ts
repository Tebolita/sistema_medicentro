import { Injectable, computed, signal, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';

export interface CasoEmergencia {
  idCaso: number;
  idPaciente: number | null;
  nombrePaciente: string;
  idMedico: number | null;
  idNivelTriage: number;
  idEstadoCaso: number;
  motivo: string;
  horaLlegada: string;
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

interface ApiResponse<T> {
  exito: boolean;
  mensaje: string;
  datos: T;
  errores: string[] | null;
}

@Injectable({ providedIn: 'root' })
export class CasosEmergenciaService {
  private apiUrl = 'https://localhost:7086/api/casos-emergencia';
  private apiUrlMedicos = 'https://localhost:7086/api/empleados/medicos';
  private apiUrlCatalogos = 'https://localhost:7086/api/catalogos';

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
    this.http.get<ApiResponse<CasoEmergencia[]>>(this.apiUrl, {
      headers: this.getHeaders(),
    }).subscribe({
      next: (resp) => {
        const lista = resp.datos ?? [];
        console.log('🔍 [CasosEmergencia] Casos cargados:', lista.length);
        this.registros.set(lista);
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
      idNivelTriage: registro.idNivelTriage,
      idEstadoCaso: registro.idEstadoCaso,
      motivo: registro.motivo,
      horaLlegada: registro.horaLlegada,  // ✅ AGREGADO
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

  eliminar(id: number): void {
    this.http.delete<ApiResponse<null>>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    }).subscribe({
      next: () => {
        this.registros.update((list) =>
          list.map((c) => (c.idCaso === id ? { ...c, activo: false } : c)),
        );
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [CasosEmergencia] No se pudo eliminar:', err.status),
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
        console.log('🔍 [CasosEmergencia] Médicos cargados:', medicos.length),
      ),
    );
  }

  // =============================================================
  // CATÁLOGOS GENÉRICOS (triaje, estado caso, etc.)
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

  RetornarNivelesTriage(): Observable<OpcionCatalogo[]> {
    return this.retornarCatalogo('NIVEL_TRIAGE').pipe(
      tap((items) =>
        console.log('🔍 [CasosEmergencia] Niveles cargados:', items.length, items),
      ),
    );
  }

  RetornarEstadosCaso(): Observable<OpcionCatalogo[]> {
    return this.retornarCatalogo('ESTADO_CASO_EMERGENCIA').pipe(
      tap((items) =>
        console.log('🔍 [CasosEmergencia] Estados cargados:', items.length, items),
      ),
    );
  }
}