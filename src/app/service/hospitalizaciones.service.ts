import { environment } from '../../environments/environment';
import { Injectable, computed, signal, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, map, tap, shareReplay, forkJoin, of } from 'rxjs';
import {
  Hospitalizacion,
  OrdenMedicaHospitalizacion,
  NotaEnfermeria,
  NotaEvolucionHospitalizacion,
  MedicamentoProgramadoHospitalizacion,
  ControlSignosHospitalizacion,
  CostoPacienteHospitalizacion,
} from '../models';

export interface CamaOpcion {
  id: number;
  label: string;
  idTipoHabitacion: number;
  idHabitacion: number;
  numeroCama: string;
  idEstadoCama: number;
}

export interface HospitalizacionCompleta {
  hospitalizacion: Hospitalizacion;
  ordenes: OrdenMedicaHospitalizacion[];
  notasEnfermeria: NotaEnfermeria[];
  notasEvolucion: NotaEvolucionHospitalizacion[];
  medicamentosProgramados: MedicamentoProgramadoHospitalizacion[];
  controlesSignos: ControlSignosHospitalizacion[];
  costosPaciente: CostoPacienteHospitalizacion[];
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
export class HospitalizacionesService {
  private apiUrl = `${environment.apiUrl}/api/Hospitalizaciones`;
  private apiUrlCamas = `${environment.apiUrl}/api/Camas`;
  private apiUrlHabitaciones = `${environment.apiUrl}/api/Habitaciones`;
  private apiUrlMedicos = `${environment.apiUrl}/api/empleados/medicos`;
  private apiUrlCatalogos = `${environment.apiUrl}/api/catalogos`;
  private apiUrlBitacora = `${environment.apiUrl}/api/bitacora-auditoria`;
  private apiUrlUsuarios = `${environment.apiUrl}/api/Usuarios`;

  private registros = signal<HospitalizacionCompleta[]>([]);
  private esNavegador: boolean;

  // Signal (no un Map plano): "activas" (computed más abajo) lee
  // idPorCodigo('ESTADO_HOSPITALIZACION', 'ACTIVA') adentro de un computed,
  // y un computed solo vuelve a calcular cuando cambia una signal que leyó.
  // Con un Map plano, si el catálogo llegaba DESPUÉS de que "registros" ya
  // se hubiera resuelto, el computed se quedaba pegado con el resultado de
  // la primera lectura (catálogo todavía vacío) para siempre.
  private catalogosCache = signal(new Map<string, OpcionCatalogo[]>());

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

  /**
   * ✅ Devuelve el id del usuario actual desde localStorage.
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
  // ✅ RESOLUCIÓN DE IDs POR CÓDIGO
  // =============================================================

  private retornarCatalogoCacheado(codigoTipo: string): Observable<OpcionCatalogo[]> {
    const cache = this.catalogosCache().get(codigoTipo);
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
      tap((items) => this.catalogosCache.update((m) => new Map(m).set(codigoTipo, items))),
      shareReplay(1),
    );
  }

  idPorCodigo(codigoTipo: string, codigoValor: string): number | null {
    const items = this.catalogosCache().get(codigoTipo);
    if (!items) return null;
    const item = items.find((x) => x.codigo === codigoValor);
    return item?.id ?? null;
  }

  opcionPorCodigo(codigoTipo: string, codigoValor: string): OpcionCatalogo | null {
    const items = this.catalogosCache().get(codigoTipo);
    if (!items) return null;
    return items.find((x) => x.codigo === codigoValor) ?? null;
  }

  precargarCatalogosCamas(): void {
    this.retornarCatalogoCacheado('ESTADO_CAMA').subscribe();
    this.retornarCatalogoCacheado('ESTADO_HOSPITALIZACION').subscribe();
  }

  // =============================================================
  // CRUD PRINCIPAL
  // =============================================================

  /**
   * ✅ Carga activos Y eliminados en paralelo.
   * Endpoint eliminados: GET /api/hospitalizaciones/eliminadas
   */
  private cargar(): void {
    if (!this.esNavegador) return;

    forkJoin({
      activos: this.http.get<ApiResponse<any[]>>(this.apiUrl, {
        headers: this.getHeaders(),
      }),
      eliminados: this.http.get<ApiResponse<any[]>>(
        `${environment.apiUrl}/api/hospitalizaciones/eliminadas`,
        { headers: this.getHeaders() },
      ),
    }).subscribe({
      next: ({ activos, eliminados }) => {
        const listaActivos = (activos.datos ?? []).map((r) => this.aCompleta(r));
        const listaEliminados = (eliminados.datos ?? []).map((r) => this.aCompleta(r));
        this.registros.set([...listaActivos, ...listaEliminados]);
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
        notasEnfermeria: item.notasEnfermeria ?? [],
        notasEvolucion: item.notasEvolucion ?? [],
        medicamentosProgramados: item.medicamentosProgramados ?? [],
        controlesSignos: item.controlesSignos ?? [],
        costosPaciente: item.costosPaciente ?? [],
      };
    }
    const { ordenes, notasEnfermeria, notasEvolucion, medicamentosProgramados, controlesSignos, costosPaciente, ...resto } = item ?? {};
    return {
      hospitalizacion: resto as Hospitalizacion,
      ordenes: ordenes ?? [],
      notasEnfermeria: notasEnfermeria ?? [],
      notasEvolucion: notasEvolucion ?? [],
      medicamentosProgramados: medicamentosProgramados ?? [],
      controlesSignos: controlesSignos ?? [],
      costosPaciente: costosPaciente ?? [],
    };
  }

  listar = computed(() =>
    this.registros()
      .filter((r) => r.hospitalizacion.activo)
      .sort((a, b) =>
        (b.hospitalizacion.fechaIngreso ?? '').localeCompare(a.hospitalizacion.fechaIngreso ?? ''),
      ),
  );

  listarInactivas = computed(() =>
    this.registros()
      .filter((r) => !r.hospitalizacion.activo)
      .sort((a, b) =>
        (b.hospitalizacion.fechaIngreso ?? '').localeCompare(a.hospitalizacion.fechaIngreso ?? ''),
      ),
  );

  activas = computed(() => {
    const idActiva = this.idPorCodigo('ESTADO_HOSPITALIZACION', 'ACTIVA');
    if (idActiva == null) return [];
    return this.listar().filter((r) => r.hospitalizacion.idEstadoHospitalizacion === idActiva);
  });

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
      idCita: registro.idCita,
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

  // =============================================================
  // HOJA DE EVOLUCIÓN (notas-enfermeria en el backend: fecha + evolución +
  // quién la escribió; el nombre del endpoint es histórico, el papel real
  // ("Hoja de Evolución") no distingue médico/enfermería).
  // =============================================================

  RetornarNotasEnfermeria(idHospitalizacion: number): Observable<NotaEnfermeria[]> {
    return this.http.get<ApiResponse<NotaEnfermeria[]>>(
      `${this.apiUrl}/${idHospitalizacion}/notas-enfermeria`,
      { headers: this.getHeaders() },
    ).pipe(
      map((resp) => resp.datos ?? []),
      tap((notasEnfermeria) => {
        this.registros.update((list) =>
          list.map((r) =>
            r.hospitalizacion.idHospitalizacion === idHospitalizacion
              ? { ...r, notasEnfermeria }
              : r,
          ),
        );
      }),
    );
  }

  agregarNotaEnfermeria(
    idHospitalizacion: number,
    nota: { idEmpleado: number; fechaHora: string; nota: string; signosVitales?: string | null },
  ): Observable<ApiResponse<any>> {
    const body = {
      idEmpleado: nota.idEmpleado,
      fechaHora: nota.fechaHora,
      nota: nota.nota,
      signosVitales: nota.signosVitales ?? null,
    };

    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/${idHospitalizacion}/notas-enfermeria`,
      body,
      { headers: this.getHeaders() },
    ).pipe(
      tap((resp) => {
        this.registros.update((list) =>
          list.map((r) =>
            r.hospitalizacion.idHospitalizacion === idHospitalizacion
              ? { ...r, notasEnfermeria: [resp.datos, ...r.notasEnfermeria] }
              : r,
          ),
        );
      }),
    );
  }

  // =============================================================
  // HOJA DE EVOLUCIÓN (médico) — distinta de notas-enfermeria (hoja
  // "ENFERMERIA"): mismo papel físico, pero cada profesión tiene su hoja.
  // =============================================================

  RetornarNotasEvolucion(idHospitalizacion: number): Observable<NotaEvolucionHospitalizacion[]> {
    return this.http.get<ApiResponse<NotaEvolucionHospitalizacion[]>>(
      `${this.apiUrl}/${idHospitalizacion}/notas-evolucion`,
      { headers: this.getHeaders() },
    ).pipe(
      map((resp) => resp.datos ?? []),
      tap((notasEvolucion) => {
        this.registros.update((list) =>
          list.map((r) =>
            r.hospitalizacion.idHospitalizacion === idHospitalizacion
              ? { ...r, notasEvolucion }
              : r,
          ),
        );
      }),
    );
  }

  agregarNotaEvolucion(
    idHospitalizacion: number,
    nota: { idMedico: number; fechaHora: string; evolucion: string },
  ): Observable<ApiResponse<any>> {
    const body = {
      idMedico: nota.idMedico,
      fechaHora: nota.fechaHora,
      evolucion: nota.evolucion,
    };

    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/${idHospitalizacion}/notas-evolucion`,
      body,
      { headers: this.getHeaders() },
    ).pipe(
      tap((resp) => {
        this.registros.update((list) =>
          list.map((r) =>
            r.hospitalizacion.idHospitalizacion === idHospitalizacion
              ? { ...r, notasEvolucion: [resp.datos, ...r.notasEvolucion] }
              : r,
          ),
        );
      }),
    );
  }

  // =============================================================
  // HOJA DE CONTROL DE MEDICAMENTOS
  // =============================================================

  RetornarMedicamentosProgramados(idHospitalizacion: number): Observable<MedicamentoProgramadoHospitalizacion[]> {
    return this.http.get<ApiResponse<MedicamentoProgramadoHospitalizacion[]>>(
      `${this.apiUrl}/${idHospitalizacion}/medicamentos-programados`,
      { headers: this.getHeaders() },
    ).pipe(
      map((resp) => resp.datos ?? []),
      tap((medicamentosProgramados) => {
        this.registros.update((list) =>
          list.map((r) =>
            r.hospitalizacion.idHospitalizacion === idHospitalizacion
              ? { ...r, medicamentosProgramados }
              : r,
          ),
        );
      }),
    );
  }

  agregarMedicamentoProgramado(
    idHospitalizacion: number,
    programado: { idMedicamento: number; hora: string; fechaInicial: string; observaciones?: string | null },
  ): Observable<ApiResponse<any>> {
    const body = {
      idMedicamento: programado.idMedicamento,
      hora: programado.hora,
      fechaInicial: programado.fechaInicial,
      observaciones: programado.observaciones ?? null,
    };

    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/${idHospitalizacion}/medicamentos-programados`,
      body,
      { headers: this.getHeaders() },
    ).pipe(
      tap((resp) => {
        this.registros.update((list) =>
          list.map((r) =>
            r.hospitalizacion.idHospitalizacion === idHospitalizacion
              ? { ...r, medicamentosProgramados: [...r.medicamentosProgramados, resp.datos] }
              : r,
          ),
        );
      }),
    );
  }

  eliminarMedicamentoProgramado(idHospitalizacion: number, idMedicamentoProgramado: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(
      `${this.apiUrl}/${idHospitalizacion}/medicamentos-programados/${idMedicamentoProgramado}`,
      { headers: this.getHeaders() },
    ).pipe(
      tap(() => {
        this.registros.update((list) =>
          list.map((r) =>
            r.hospitalizacion.idHospitalizacion === idHospitalizacion
              ? { ...r, medicamentosProgramados: r.medicamentosProgramados.filter((p) => p.idMedicamentoProgramado !== idMedicamentoProgramado) }
              : r,
          ),
        );
      }),
    );
  }

  agregarAdministracion(
    idHospitalizacion: number,
    idMedicamentoProgramado: number,
    administracion: { idEmpleado: number; fechaHora: string },
  ): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/${idHospitalizacion}/medicamentos-programados/${idMedicamentoProgramado}/administraciones`,
      administracion,
      { headers: this.getHeaders() },
    ).pipe(
      tap((resp) => {
        this.registros.update((list) =>
          list.map((r) =>
            r.hospitalizacion.idHospitalizacion === idHospitalizacion
              ? {
                  ...r,
                  medicamentosProgramados: r.medicamentosProgramados.map((p) =>
                    p.idMedicamentoProgramado === idMedicamentoProgramado
                      ? { ...p, administraciones: [...p.administraciones, resp.datos] }
                      : p,
                  ),
                }
              : r,
          ),
        );
      }),
    );
  }

  eliminarAdministracion(
    idHospitalizacion: number,
    idMedicamentoProgramado: number,
    idAdministracion: number,
  ): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(
      `${this.apiUrl}/${idHospitalizacion}/medicamentos-programados/${idMedicamentoProgramado}/administraciones/${idAdministracion}`,
      { headers: this.getHeaders() },
    ).pipe(
      tap(() => {
        this.registros.update((list) =>
          list.map((r) =>
            r.hospitalizacion.idHospitalizacion === idHospitalizacion
              ? {
                  ...r,
                  medicamentosProgramados: r.medicamentosProgramados.map((p) =>
                    p.idMedicamentoProgramado === idMedicamentoProgramado
                      ? { ...p, administraciones: p.administraciones.filter((a) => a.idAdministracion !== idAdministracion) }
                      : p,
                  ),
                }
              : r,
          ),
        );
      }),
    );
  }

  // =============================================================
  // CONTROL DE SIGNOS
  // =============================================================

  RetornarControlSignos(idHospitalizacion: number): Observable<ControlSignosHospitalizacion[]> {
    return this.http.get<ApiResponse<ControlSignosHospitalizacion[]>>(
      `${this.apiUrl}/${idHospitalizacion}/control-signos`,
      { headers: this.getHeaders() },
    ).pipe(
      map((resp) => resp.datos ?? []),
      tap((controlesSignos) => {
        this.registros.update((list) =>
          list.map((r) =>
            r.hospitalizacion.idHospitalizacion === idHospitalizacion
              ? { ...r, controlesSignos }
              : r,
          ),
        );
      }),
    );
  }

  agregarControlSignos(
    idHospitalizacion: number,
    control: {
      fechaHora: string;
      presionArterial?: string | null;
      temperatura?: number | null;
      frecuenciaRespiratoria?: number | null;
      observaciones?: string | null;
    },
  ): Observable<ApiResponse<any>> {
    const body = {
      fechaHora: control.fechaHora,
      presionArterial: control.presionArterial ?? null,
      temperatura: control.temperatura ?? null,
      frecuenciaRespiratoria: control.frecuenciaRespiratoria ?? null,
      observaciones: control.observaciones ?? null,
    };

    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/${idHospitalizacion}/control-signos`,
      body,
      { headers: this.getHeaders() },
    ).pipe(
      tap((resp) => {
        this.registros.update((list) =>
          list.map((r) =>
            r.hospitalizacion.idHospitalizacion === idHospitalizacion
              ? { ...r, controlesSignos: [resp.datos, ...r.controlesSignos] }
              : r,
          ),
        );
      }),
    );
  }

  eliminarControlSignos(idHospitalizacion: number, idControlSignos: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(
      `${this.apiUrl}/${idHospitalizacion}/control-signos/${idControlSignos}`,
      { headers: this.getHeaders() },
    ).pipe(
      tap(() => {
        this.registros.update((list) =>
          list.map((r) =>
            r.hospitalizacion.idHospitalizacion === idHospitalizacion
              ? { ...r, controlesSignos: r.controlesSignos.filter((c) => c.idControlSignos !== idControlSignos) }
              : r,
          ),
        );
      }),
    );
  }

  // =============================================================
  // COSTO PACIENTE
  // =============================================================

  RetornarCostosPaciente(idHospitalizacion: number): Observable<CostoPacienteHospitalizacion[]> {
    return this.http.get<ApiResponse<CostoPacienteHospitalizacion[]>>(
      `${this.apiUrl}/${idHospitalizacion}/costos-paciente`,
      { headers: this.getHeaders() },
    ).pipe(
      map((resp) => resp.datos ?? []),
      tap((costosPaciente) => {
        this.registros.update((list) =>
          list.map((r) =>
            r.hospitalizacion.idHospitalizacion === idHospitalizacion
              ? { ...r, costosPaciente }
              : r,
          ),
        );
      }),
    );
  }

  agregarCostoPaciente(
    idHospitalizacion: number,
    costo: { idMedicamento?: number | null; fecha: string; descripcion: string; cantidad: number; valorUnitario: number },
  ): Observable<ApiResponse<any>> {
    const body = {
      idMedicamento: costo.idMedicamento ?? null,
      fecha: costo.fecha,
      descripcion: costo.descripcion,
      cantidad: costo.cantidad,
      valorUnitario: costo.valorUnitario,
    };

    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/${idHospitalizacion}/costos-paciente`,
      body,
      { headers: this.getHeaders() },
    ).pipe(
      tap((resp) => {
        this.registros.update((list) =>
          list.map((r) =>
            r.hospitalizacion.idHospitalizacion === idHospitalizacion
              ? { ...r, costosPaciente: [resp.datos, ...r.costosPaciente] }
              : r,
          ),
        );
      }),
    );
  }

  eliminarCostoPaciente(idHospitalizacion: number, idCostoPaciente: number): Observable<ApiResponse<null>> {
    return this.http.delete<ApiResponse<null>>(
      `${this.apiUrl}/${idHospitalizacion}/costos-paciente/${idCostoPaciente}`,
      { headers: this.getHeaders() },
    ).pipe(
      tap(() => {
        this.registros.update((list) =>
          list.map((r) =>
            r.hospitalizacion.idHospitalizacion === idHospitalizacion
              ? { ...r, costosPaciente: r.costosPaciente.filter((c) => c.idCostoPaciente !== idCostoPaciente) }
              : r,
          ),
        );
      }),
    );
  }

  /**
   * ✅ Elimina (baja lógica).
   * Actualiza el signal local con activo=false, fechaModificacion e idUsuarioModificacion.
   */
  eliminar(id: number): void {
    this.http.delete<ApiResponse<null>>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders(),
    }).subscribe({
      next: () => {
        const ahora = new Date().toISOString();
        const idUsuarioActual = this.obtenerIdUsuarioActual();

        this.registros.update((list) =>
          list.map((r) =>
            r.hospitalizacion.idHospitalizacion === id
              ? {
                  ...r,
                  hospitalizacion: {
                    ...r.hospitalizacion,
                    activo: false,
                    fechaModificacion: ahora,
                    idUsuarioModificacion: idUsuarioActual,
                  } as Hospitalizacion,
                }
              : r,
          ),
        );
      },
      error: (err: HttpErrorResponse) =>
        console.error('❌ [Hospitalizaciones] No se pudo eliminar:', err.status),
    });
  }

  /**
   * ✅ Reactiva una hospitalización eliminada.
   * Endpoint: PUT /api/Hospitalizaciones/{id}/reactivar
   */
  reactivar(id: number): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(
      `${this.apiUrl}/${id}/reactivar`,
      {},
      { headers: this.getHeaders() },
    ).pipe(
      tap(() => {
        this.registros.update((list) =>
          list.map((r) =>
            r.hospitalizacion.idHospitalizacion === id
              ? { ...r, hospitalizacion: { ...r.hospitalizacion, activo: true } }
              : r,
          ),
        );
      }),
    );
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

        return camas;
      }),
    );
  }

  RetornarCamasLibres(): Observable<CamaOpcion[]> {
    return this.RetornarCamas().pipe(
      map((camas) => {
        const idLibre = this.idPorCodigo('ESTADO_CAMA', 'LIBRE');
        if (idLibre == null) return [];
        return camas.filter((c) => c.idEstadoCama === idLibre);
      }),
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

  RetornarEstadosHospitalizacion(): Observable<OpcionCatalogo[]> {
    return this.retornarCatalogoCacheado('ESTADO_HOSPITALIZACION');
  }

  RetornarTiposOrden(): Observable<OpcionCatalogo[]> {
    return this.retornarCatalogoCacheado('TIPO_ORDEN_HOSPITALIZACION');
  }

  RetornarEstadosCama(): Observable<OpcionCatalogo[]> {
    return this.retornarCatalogoCacheado('ESTADO_CAMA');
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