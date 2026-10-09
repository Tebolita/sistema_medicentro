import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';
import { ApiResponse } from '../models/api-response.model';
import { ErrorService } from './error.service';

// Un solo registro eliminado de cualquier recurso, ya "aplanado" para
// mostrarlo en la lista: PapeleraService.listar() se encarga de sacar el id
// y el título real de la forma que tenga cada recurso (algunos son planos,
// otros vienen envueltos como {principal, hijos...} — ver RECURSOS_PAPELERA).
export interface RegistroEliminado {
  id: number;
  titulo: string;
  detalle: string | null;
  // "Cuándo" (FechaModificacion) y "quién" (IdUsuarioModificacion) del
  // momento exacto en que se dio de baja: el backend los llena solo en TODO
  // guardado (interceptor en MedicentroDbContext.SaveChangesAsync), pero no
  // todos los DTOs del GET normal los expone todavía — null cuando ese DTO
  // en particular no los trae (ver RecursoPapelera.obtenerFecha/obtenerIdUsuario).
  fecha: string | null;
  idUsuario: number | null;
  original: unknown;
}

export interface RecursoPapelera {
  // Segmento de URL real en el backend (EliminadosController): tanto para
  // listar (api/{recurso}/eliminad{os|as}) como para reactivar
  // (api/{recurso}/{id}/reactivar) — el backend usa la MISMA palabra para
  // ambos, solo el sufijo de "listar" cambia de género.
  recurso: string;
  sufijoLista: 'eliminados' | 'eliminadas';
  label: string;
  grupo: string;
  // Dónde viven el id y el título dentro del objeto que devuelve el backend.
  // Para los recursos "compuestos" (citas, recetas, tratamientos, convenios,
  // habitaciones, laboratorio, hospitalizaciones, facturas) todo vive bajo
  // una sola propiedad anidada (ver EliminadosService.cs: Cita, Receta,
  // Tratamiento, Convenio, Habitacion, Orden, Hospitalizacion, Factura).
  obtenerId: (item: any) => number;
  obtenerTitulo: (item: any) => string;
  obtenerDetalle?: (item: any) => string | null;
  // Ausentes cuando el DTO de ese recurso todavía no expone
  // FechaModificacion/IdUsuarioModificacion (confirmado leyendo cada Dto/*.cs
  // real — no todos los tienen hoy).
  obtenerFecha?: (item: any) => string | null;
  obtenerIdUsuario?: (item: any) => number | null;
}

const nombreCompleto = (p: any, primerCampo: string, apellidoCampo: string) =>
  [p[primerCampo], p[apellidoCampo]].filter(Boolean).join(' ') || '—';

// Para los recursos planos (fechaModificacion/idUsuarioModificacion en la
// raíz del objeto) y compuestos (anidados bajo la misma propiedad que ya usa
// obtenerId, p. ej. "convenio.fechaModificacion").
const fechaPlano = (item: any) => item.fechaModificacion ?? null;
const usuarioPlano = (item: any) => item.idUsuarioModificacion ?? null;
const fechaAnidada = (prop: string) => (item: any) => item[prop]?.fechaModificacion ?? null;
const usuarioAnidado = (prop: string) => (item: any) => item[prop]?.idUsuarioModificacion ?? null;

// Catálogo de los 30 recursos que expone EliminadosController, con los
// nombres de campo exactos confirmados leyendo cada DTO del backend
// (Dto/**/*.cs) — adivinar acá es lo que ya corrompió datos una vez
// (ver AUDITORIA_DDL_IDS_QUEMADOS.md), así que cada id/título está verificado
// contra el DTO real, no inferido del nombre del recurso.
export const RECURSOS_PAPELERA: RecursoPapelera[] = [
  // ---- Planos ----
  {
    recurso: 'medicamentos', sufijoLista: 'eliminados', label: 'Medicamentos', grupo: 'farmacia',
    obtenerId: (m) => m.idMedicamento, obtenerTitulo: (m) => m.nombre, obtenerDetalle: (m) => m.principioActivo ?? null,
    obtenerFecha: fechaPlano, obtenerIdUsuario: usuarioPlano,
  },
  {
    recurso: 'pacientes', sufijoLista: 'eliminados', label: 'Pacientes', grupo: 'recepcion',
    obtenerId: (p) => p.idPaciente, obtenerTitulo: (p) => nombreCompleto(p, 'primerNombre', 'primerApellido'),
    obtenerDetalle: (p) => p.codigoExpediente ?? null,
    obtenerFecha: fechaPlano, obtenerIdUsuario: usuarioPlano,
  },
  {
    recurso: 'polizas', sufijoLista: 'eliminadas', label: 'Pólizas', grupo: 'seguros-medicos',
    obtenerId: (p) => p.idPoliza, obtenerTitulo: (p) => p.numeroPoliza, obtenerDetalle: (p) => p.nombreTitular ?? null,
    obtenerFecha: fechaPlano, obtenerIdUsuario: usuarioPlano,
  },
  {
    recurso: 'expedientes', sufijoLista: 'eliminados', label: 'Expedientes clínicos', grupo: 'expedientes-clinicos',
    obtenerId: (h) => h.idHistorial, obtenerTitulo: (h) => h.diagnostico || h.motivoConsulta || `Registro ${h.idHistorial}`,
    obtenerDetalle: (h) => h.fecha ?? null,
    obtenerFecha: fechaPlano, obtenerIdUsuario: usuarioPlano,
  },
  {
    recurso: 'casos-emergencia', sufijoLista: 'eliminados', label: 'Casos de emergencia', grupo: 'emergencias',
    obtenerId: (c) => c.idCaso, obtenerTitulo: (c) => c.nombrePaciente || `Caso ${c.idCaso}`, obtenerDetalle: (c) => c.motivo ?? null,
    obtenerFecha: fechaPlano, obtenerIdUsuario: usuarioPlano,
  },
  {
    recurso: 'compromisos-pago', sufijoLista: 'eliminados', label: 'Compromisos de pago', grupo: 'emergencias',
    obtenerId: (c) => c.idConsentimiento, obtenerTitulo: (c) => c.nombreResponsable || `Compromiso ${c.idConsentimiento}`,
    obtenerDetalle: (c) => c.fechaFirma ?? null,
    obtenerFecha: fechaPlano, obtenerIdUsuario: usuarioPlano,
  },
  {
    // InteraccionDto no expone IdUsuarioModificacion todavía (confirmado en el DTO real).
    recurso: 'interacciones-medicamentos', sufijoLista: 'eliminadas', label: 'Interacciones de medicamentos', grupo: 'farmacia',
    obtenerId: (i) => i.idInteraccion, obtenerTitulo: (i) => i.descripcion || `Interacción ${i.idInteraccion}`,
    obtenerFecha: fechaPlano,
  },
  {
    // ProveedorDto no expone IdUsuarioModificacion todavía.
    recurso: 'proveedores', sufijoLista: 'eliminados', label: 'Proveedores', grupo: 'farmacia',
    obtenerId: (p) => p.idProveedor, obtenerTitulo: (p) => p.nombre, obtenerDetalle: (p) => p.nit ?? null,
    obtenerFecha: fechaPlano,
  },
  {
    // AseguradoraDto no expone ni FechaModificacion ni IdUsuarioModificacion todavía.
    recurso: 'aseguradoras', sufijoLista: 'eliminadas', label: 'Aseguradoras', grupo: 'seguros-medicos',
    obtenerId: (a) => a.idAseguradora, obtenerTitulo: (a) => a.nombre, obtenerDetalle: (a) => a.nit ?? null,
  },
  {
    // EmpleadoDto no expone IdUsuarioModificacion todavía.
    recurso: 'empleados', sufijoLista: 'eliminados', label: 'Empleados', grupo: 'Recursos Humanos',
    obtenerId: (e) => e.idEmpleado, obtenerTitulo: (e) => nombreCompleto(e, 'primerNombre', 'primerApellido'),
    obtenerDetalle: (e) => e.colegiado ?? null,
    obtenerFecha: fechaPlano,
  },
  {
    recurso: 'salas', sufijoLista: 'eliminadas', label: 'Salas', grupo: 'General',
    obtenerId: (s) => s.idSala, obtenerTitulo: (s) => s.nombre,
    obtenerFecha: fechaPlano, obtenerIdUsuario: usuarioPlano,
  },
  {
    recurso: 'disponibilidad-medico', sufijoLista: 'eliminadas', label: 'Disponibilidad de médicos', grupo: 'Recursos Humanos',
    obtenerId: (d) => d.idDisponibilidad, obtenerTitulo: (d) => `Médico ${d.idMedico}`,
    obtenerDetalle: (d) => (d.horaInicio && d.horaFin ? `${d.horaInicio} - ${d.horaFin}` : null),
    obtenerFecha: fechaPlano, obtenerIdUsuario: usuarioPlano,
  },
  {
    recurso: 'inventario-farmacia', sufijoLista: 'eliminados', label: 'Inventario de farmacia', grupo: 'farmacia',
    obtenerId: (i) => i.idItemInventario, obtenerTitulo: (i) => i.nombre,
    obtenerFecha: fechaPlano, obtenerIdUsuario: usuarioPlano,
  },
  {
    recurso: 'notas-credito', sufijoLista: 'eliminadas', label: 'Notas de crédito', grupo: 'facturacion-cobros',
    obtenerId: (n) => n.idNotaCredito, obtenerTitulo: (n) => n.numeroDocumento, obtenerDetalle: (n) => (n.monto != null ? `Q${n.monto}` : null),
    obtenerFecha: fechaPlano, obtenerIdUsuario: usuarioPlano,
  },
  {
    // UsuarioDto no expone IdUsuarioModificacion todavía.
    recurso: 'usuarios', sufijoLista: 'eliminados', label: 'Usuarios', grupo: 'Seguridad',
    obtenerId: (u) => u.idUsuario, obtenerTitulo: (u) => u.nombreUsuario, obtenerDetalle: (u) => u.correo ?? null,
    obtenerFecha: fechaPlano,
  },
  {
    recurso: 'roles', sufijoLista: 'eliminados', label: 'Roles', grupo: 'Seguridad',
    obtenerId: (r) => r.idRol, obtenerTitulo: (r) => r.nombre,
    obtenerFecha: fechaPlano, obtenerIdUsuario: usuarioPlano,
  },
  {
    // PermisoDto no expone IdUsuarioModificacion todavía.
    recurso: 'permisos', sufijoLista: 'eliminados', label: 'Permisos', grupo: 'Seguridad',
    obtenerId: (p) => p.idPermiso, obtenerTitulo: (p) => p.nombre, obtenerDetalle: (p) => p.codigo ?? null,
    obtenerFecha: fechaPlano,
  },
  {
    // EspecialidadDto no expone IdUsuarioModificacion todavía.
    recurso: 'especialidades', sufijoLista: 'eliminadas', label: 'Especialidades', grupo: 'Recursos Humanos',
    obtenerId: (e) => e.idEspecialidad, obtenerTitulo: (e) => e.nombre,
    obtenerFecha: fechaPlano,
  },
  {
    // PuestoDto no expone IdUsuarioModificacion todavía.
    recurso: 'puestos', sufijoLista: 'eliminados', label: 'Puestos', grupo: 'Recursos Humanos',
    obtenerId: (p) => p.idPuesto, obtenerTitulo: (p) => p.nombre,
    obtenerFecha: fechaPlano,
  },
  {
    recurso: 'actas', sufijoLista: 'eliminadas', label: 'Libro de actas', grupo: 'recepcion',
    obtenerId: (a) => a.idActa, obtenerTitulo: (a) => a.motivoIngreso || `Acta ${a.idActa}`, obtenerDetalle: (a) => a.fechaHora ?? null,
    obtenerFecha: fechaPlano, obtenerIdUsuario: usuarioPlano,
  },
  {
    // TipoExamenDto no expone IdUsuarioModificacion todavía.
    recurso: 'tipos-examen', sufijoLista: 'eliminados', label: 'Tipos de examen', grupo: 'laboratorio-diagnostico',
    obtenerId: (t) => t.idTipoExamen, obtenerTitulo: (t) => t.nombre,
    obtenerFecha: fechaPlano,
  },
  {
    // TipoConsentimientoDto no expone IdUsuarioModificacion todavía.
    recurso: 'tipos-consentimiento', sufijoLista: 'eliminados', label: 'Tipos de consentimiento', grupo: 'emergencias',
    obtenerId: (t) => t.idTipoConsentimiento, obtenerTitulo: (t) => t.nombre, obtenerDetalle: (t) => t.codigo ?? null,
    obtenerFecha: fechaPlano,
  },
  // ---- Compuestos: todo vive bajo una sola propiedad anidada ----
  {
    recurso: 'citas', sufijoLista: 'eliminadas', label: 'Citas', grupo: 'recepcion',
    obtenerId: (c) => c.cita.idCita, obtenerTitulo: (c) => c.cita.motivoConsulta || `Cita ${c.cita.idCita}`,
    obtenerDetalle: (c) => c.cita.fechaHoraInicio ?? null,
    obtenerFecha: fechaAnidada('cita'), obtenerIdUsuario: usuarioAnidado('cita'),
  },
  {
    recurso: 'recetas', sufijoLista: 'eliminadas', label: 'Recetas', grupo: 'farmacia',
    obtenerId: (r) => r.receta.idReceta, obtenerTitulo: (r) => `Receta ${r.receta.idReceta}`, obtenerDetalle: (r) => r.receta.fechaEmision ?? null,
    obtenerFecha: fechaAnidada('receta'), obtenerIdUsuario: usuarioAnidado('receta'),
  },
  {
    recurso: 'tratamientos', sufijoLista: 'eliminados', label: 'Tratamientos', grupo: 'expedientes-clinicos',
    obtenerId: (t) => t.tratamiento.idTratamiento, obtenerTitulo: (t) => t.tratamiento.diagnostico || `Tratamiento ${t.tratamiento.idTratamiento}`,
    obtenerDetalle: (t) => t.tratamiento.fechaInicio ?? null,
    obtenerFecha: fechaAnidada('tratamiento'), obtenerIdUsuario: usuarioAnidado('tratamiento'),
  },
  {
    recurso: 'convenios', sufijoLista: 'eliminados', label: 'Convenios', grupo: 'facturacion-cobros',
    obtenerId: (c) => c.convenio.idConvenio, obtenerTitulo: (c) => c.convenio.nombreConvenio,
    obtenerFecha: fechaAnidada('convenio'), obtenerIdUsuario: usuarioAnidado('convenio'),
  },
  {
    // HabitacionDto no expone IdUsuarioModificacion todavía.
    recurso: 'habitaciones', sufijoLista: 'eliminadas', label: 'Habitaciones', grupo: 'hospitalizacion',
    obtenerId: (h) => h.habitacion.idHabitacion, obtenerTitulo: (h) => `Habitación ${h.habitacion.numero}`, obtenerDetalle: (h) => (h.habitacion.piso != null ? `Piso ${h.habitacion.piso}` : null),
    obtenerFecha: fechaAnidada('habitacion'),
  },
  {
    recurso: 'laboratorio', sufijoLista: 'eliminadas', label: 'Órdenes de laboratorio', grupo: 'laboratorio-diagnostico',
    obtenerId: (o) => o.orden.idOrden, obtenerTitulo: (o) => `Orden ${o.orden.idOrden}`, obtenerDetalle: (o) => o.orden.fechaOrden ?? null,
    obtenerFecha: fechaAnidada('orden'), obtenerIdUsuario: usuarioAnidado('orden'),
  },
  {
    recurso: 'hospitalizaciones', sufijoLista: 'eliminadas', label: 'Hospitalizaciones', grupo: 'hospitalizacion',
    obtenerId: (h) => h.hospitalizacion.idHospitalizacion, obtenerTitulo: (h) => h.hospitalizacion.motivoIngreso || `Hospitalización ${h.hospitalizacion.idHospitalizacion}`,
    obtenerDetalle: (h) => h.hospitalizacion.fechaIngreso ?? null,
    obtenerFecha: fechaAnidada('hospitalizacion'), obtenerIdUsuario: usuarioAnidado('hospitalizacion'),
  },
  {
    recurso: 'facturas', sufijoLista: 'eliminadas', label: 'Facturas', grupo: 'facturacion-cobros',
    obtenerId: (f) => f.factura.idFactura, obtenerTitulo: (f) => f.factura.numeroDocumento, obtenerDetalle: (f) => (f.factura.total != null ? `Q${f.factura.total}` : null),
    obtenerFecha: fechaAnidada('factura'), obtenerIdUsuario: usuarioAnidado('factura'),
  },
];

// `hospitalizaciones` es de solo lectura a propósito: el backend comentó su
// ruta de reactivar (EliminadosController.cs) — no se expone el botón para
// ese recurso.
export const RECURSOS_SOLO_LECTURA = new Set(['hospitalizaciones']);

@Injectable({ providedIn: 'root' })
export class PapeleraService {
  private http = inject(HttpClient);
  private errorService = inject(ErrorService);
  private apiUrl = 'https://localhost:7086/api';

  listar(recurso: RecursoPapelera): Observable<RegistroEliminado[]> {
    return this.http.get<ApiResponse<unknown[]>>(`${this.apiUrl}/${recurso.recurso}/${recurso.sufijoLista}`).pipe(
      map((resp) =>
        (resp.datos ?? []).map((item) => ({
          id: recurso.obtenerId(item),
          titulo: recurso.obtenerTitulo(item) || '—',
          detalle: recurso.obtenerDetalle?.(item) ?? null,
          fecha: recurso.obtenerFecha?.(item) ?? null,
          idUsuario: recurso.obtenerIdUsuario?.(item) ?? null,
          original: item,
        })),
      ),
      catchError(this.errorService.handleError),
    );
  }

  reactivar(recurso: RecursoPapelera, id: number): Observable<unknown> {
    return this.http
      .put<ApiResponse<unknown>>(`${this.apiUrl}/${recurso.recurso}/${id}/reactivar`, {})
      .pipe(catchError(this.errorService.handleError));
  }
}
