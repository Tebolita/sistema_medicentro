import { HistorialCambios } from '../../shared/historial-cambios/historial-cambios';
import { tieneCambios } from '../../shared/bitacora-cambios';
import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { BitacoraItem, EmpleadoInput, EmpleadosService } from '../../service/empleados.service';
import { PuestosService } from '../../service/puestos.service';
import { EspecialidadesService } from '../../service/especialidades.service';
import { GENEROS, TIPOS_DOCUMENTO, ESTADOS_EMPLEADO } from '../empleados-catalogos';
import { CatalogosService } from '../../service/catalogos.service';
import { UsuariosService } from '../../service/usuarios.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { ConfirmacionService } from '../../shared/confirmacion/confirmacion.service';
import { ColumnaCsv, ImportarCsvDialog, ImportarCsvDialogData } from '../../shared/importar-csv/importar-csv-dialog';

type Vista = 'activos' | 'eliminados';

@Component({
  selector: 'app-empleados-lista',
  imports: [HistorialCambios, FormsModule, NgClass, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './empleados-lista.html',
  styleUrl: './empleados-lista.css',
})
export class EmpleadosLista {
  private empleadosService = inject(EmpleadosService);
  private accionAuditoria = inject(AuditoriaAccionService);
  private puestosService = inject(PuestosService);
  private especialidadesService = inject(EspecialidadesService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);
  private dialog = inject(MatDialog);

  private catalogos = inject(CatalogosService);
  private confirmacion = inject(ConfirmacionService);
  private estadosApi = this.catalogos.obtener('ESTADO_EMPLEADO');
  private estados = computed(() => {
    const api = this.estadosApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : ESTADOS_EMPLEADO;
  });
  private generosApi = this.catalogos.obtener('GENERO');
  private generos = computed(() => {
    const api = this.generosApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : GENEROS;
  });
  private tiposDocumentoApi = this.catalogos.obtener('TIPO_DOCUMENTO');
  private tiposDocumento = computed(() => {
    const api = this.tiposDocumentoApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : TIPOS_DOCUMENTO;
  });

  buscar = signal('');
  errorAccion = signal('');

  // Pestaña "Eliminados": por ahora cualquiera con sesión la puede ver.
  // TODO: restringir a admin cuando exista control de roles en el frontend.
  vista = signal<Vista>('activos');
  cargandoEliminados = this.empleadosService.cargandoEliminados;
  errorEliminados = this.empleadosService.errorEliminados;

  cargando = computed(() => (this.vista() === 'activos' ? this.empleadosService.cargando() : this.cargandoEliminados()));
  errorCarga = computed(() => (this.vista() === 'activos' ? this.empleadosService.errorCarga() : this.errorEliminados()));

  verActivos(): void {
    this.vista.set('activos');
  }

  verEliminados(): void {
    this.vista.set('eliminados');
    if (!this.empleadosService.listarEliminados().length) {
      this.empleadosService.cargarEliminados();
    }
  }

  empleados = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.vista() === 'activos' ? this.empleadosService.listar() : this.empleadosService.listarEliminados();
    if (!term) {
      return lista;
    }
    return lista.filter((e) =>
      [e.primerNombre, e.segundoNombre, e.primerApellido, e.segundoApellido, e.correo, e.numeroDocumento]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

  nombreCompleto(idEmpleado: number): string {
    return this.empleadosService.nombreCompleto(idEmpleado);
  }

  puestoLabel(idPuesto: number): string {
    return this.puestosService.obtener(idPuesto)?.nombre ?? '—';
  }

  estadoLabel(idEstadoEmpleado: number): string {
    return this.estados().find((e) => e.id === idEstadoEmpleado)?.label ?? '—';
  }

  async eliminar(id: number, nombre: string): Promise<void> {
    if (!(await this.confirmacion.confirmar(`¿Dar de baja al empleado "${nombre}"?`))) {
      return;
    }
    this.errorAccion.set('');
    this.empleadosService.eliminar(id).subscribe({
      next: () => this.notificaciones.exito('Eliminado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  async reactivar(id: number, nombre: string): Promise<void> {
    if (!(await this.confirmacion.confirmar(`¿Reactivar al empleado "${nombre}"?`))) {
      return;
    }
    this.errorAccion.set('');
    this.empleadosService.reactivar(id).subscribe({
      next: () => this.notificaciones.exito('Reactivado correctamente'),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  // ============================================================
  // IMPORTAR CSV
  // ============================================================

  private readonly columnasCsv: ColumnaCsv[] = [
    { clave: 'primer_nombre', etiqueta: 'Primer nombre', requerido: true, ejemplo: 'María' },
    { clave: 'segundo_nombre', etiqueta: 'Segundo nombre (opcional)', requerido: false, ejemplo: 'Elena' },
    { clave: 'primer_apellido', etiqueta: 'Primer apellido', requerido: true, ejemplo: 'López' },
    { clave: 'segundo_apellido', etiqueta: 'Segundo apellido (opcional)', requerido: false, ejemplo: 'García' },
    { clave: 'fecha_nacimiento', etiqueta: 'Fecha de nacimiento (opcional, AAAA-MM-DD)', requerido: false, ejemplo: '1990-05-14' },
    { clave: 'genero', etiqueta: 'Género (opcional)', requerido: false, ejemplo: 'Femenino' },
    { clave: 'tipo_documento', etiqueta: 'Tipo de documento (opcional)', requerido: false, ejemplo: 'DPI' },
    { clave: 'numero_documento', etiqueta: 'Número de documento (opcional)', requerido: false, ejemplo: '1234567890101' },
    { clave: 'puesto', etiqueta: 'Nombre exacto del puesto', requerido: true, ejemplo: 'Enfermero/a' },
    { clave: 'especialidad', etiqueta: 'Especialidad (opcional, solo médicos)', requerido: false, ejemplo: '' },
    { clave: 'colegiado', etiqueta: 'Número de colegiado (opcional)', requerido: false, ejemplo: '' },
    { clave: 'fecha_ingreso', etiqueta: 'Fecha de ingreso (AAAA-MM-DD)', requerido: true, ejemplo: '2026-01-15' },
    { clave: 'estado', etiqueta: 'Estado (ej. Activo, Inactivo, Suspendido)', requerido: true, ejemplo: 'Activo' },
    { clave: 'telefono', etiqueta: 'Teléfono (opcional)', requerido: false, ejemplo: '55554444' },
    { clave: 'correo', etiqueta: 'Correo (opcional)', requerido: false, ejemplo: 'maria.lopez@medicentro.gt' },
    { clave: 'direccion', etiqueta: 'Dirección (opcional)', requerido: false, ejemplo: 'Zona 10, Guatemala' },
  ];

  private validarFilaCsv(fila: Record<string, string>): { errores: string[]; datos: EmpleadoInput | null } {
    const errores: string[] = [];
    const fechaRegex = /^\d{4}-\d{2}-\d{2}$/;

    const primerNombre = (fila['primer_nombre'] ?? '').trim();
    if (!primerNombre) errores.push('Falta el primer nombre');

    const primerApellido = (fila['primer_apellido'] ?? '').trim();
    if (!primerApellido) errores.push('Falta el primer apellido');

    const fechaNacimiento = (fila['fecha_nacimiento'] ?? '').trim();
    if (fechaNacimiento && !fechaRegex.test(fechaNacimiento)) errores.push('La fecha de nacimiento debe tener el formato AAAA-MM-DD');

    const generoTexto = (fila['genero'] ?? '').trim();
    const idGenero = generoTexto ? this.generos().find((g) => g.label.toLowerCase() === generoTexto.toLowerCase())?.id ?? null : null;
    if (generoTexto && idGenero === null) errores.push(`El género "${generoTexto}" no existe (revisa Mantenimiento → Catálogos)`);

    const tipoDocTexto = (fila['tipo_documento'] ?? '').trim();
    const idTipoDocumento = tipoDocTexto
      ? this.tiposDocumento().find((t) => t.label.toLowerCase() === tipoDocTexto.toLowerCase())?.id ?? null
      : null;
    if (tipoDocTexto && idTipoDocumento === null) errores.push(`El tipo de documento "${tipoDocTexto}" no existe (revisa Mantenimiento → Catálogos)`);

    const puestoTexto = (fila['puesto'] ?? '').trim();
    const idPuesto = puestoTexto
      ? this.puestosService.listar().find((p) => p.nombre.toLowerCase() === puestoTexto.toLowerCase())?.idPuesto ?? null
      : null;
    if (!puestoTexto) errores.push('Falta el puesto');
    else if (idPuesto === null) errores.push(`No existe el puesto "${puestoTexto}" (créalo primero en Mantenimiento → Puestos)`);

    const especialidadTexto = (fila['especialidad'] ?? '').trim();
    const idEspecialidad = especialidadTexto
      ? this.especialidadesService.listar().find((e) => e.nombre.toLowerCase() === especialidadTexto.toLowerCase())?.idEspecialidad ?? null
      : null;
    if (especialidadTexto && idEspecialidad === null) errores.push(`No existe la especialidad "${especialidadTexto}"`);

    const fechaIngreso = (fila['fecha_ingreso'] ?? '').trim();
    if (!fechaIngreso) errores.push('Falta la fecha de ingreso');
    else if (!fechaRegex.test(fechaIngreso)) errores.push('La fecha de ingreso debe tener el formato AAAA-MM-DD');

    const estadoTexto = (fila['estado'] ?? '').trim();
    const idEstadoEmpleado = estadoTexto ? this.estados().find((e) => e.label.toLowerCase() === estadoTexto.toLowerCase())?.id ?? null : null;
    if (!estadoTexto) errores.push('Falta el estado');
    else if (idEstadoEmpleado === null) errores.push(`El estado "${estadoTexto}" no existe (revisa Mantenimiento → Catálogos)`);

    const correo = (fila['correo'] ?? '').trim();
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) errores.push(`El correo "${correo}" no es válido`);

    if (errores.length > 0 || idPuesto === null || idEstadoEmpleado === null) return { errores, datos: null };

    return {
      errores: [],
      datos: {
        primerNombre,
        segundoNombre: (fila['segundo_nombre'] ?? '').trim() || null,
        primerApellido,
        segundoApellido: (fila['segundo_apellido'] ?? '').trim() || null,
        fechaNacimiento: fechaNacimiento || null,
        idGenero,
        idTipoDocumento,
        numeroDocumento: (fila['numero_documento'] ?? '').trim() || null,
        idPuesto,
        idEspecialidad,
        colegiado: (fila['colegiado'] ?? '').trim() || null,
        fechaIngreso,
        fechaEgreso: null,
        idEstadoEmpleado,
        telefono: (fila['telefono'] ?? '').trim() || null,
        correo: correo || null,
        direccion: (fila['direccion'] ?? '').trim() || null,
      },
    };
  }

  abrirImportarCsv(): void {
    this.dialog
      .open<ImportarCsvDialog<EmpleadoInput>, ImportarCsvDialogData<EmpleadoInput>>(ImportarCsvDialog, {
        autoFocus: false,
        data: {
          titulo: 'Importar empleados desde CSV',
          icono: 'badge',
          nombreEntidadPlural: 'empleados',
          nombreArchivoPlantilla: 'plantilla_empleados.csv',
          columnas: this.columnasCsv,
          ayuda:
            'El "puesto" debe existir primero en Mantenimiento → Puestos (créalos ahí o impórtalos antes). "especialidad" solo aplica a médicos y debe existir en Mantenimiento → Especialidades.',
          validarFila: (fila) => this.validarFilaCsv(fila),
          resumenFila: (datos) => `${datos.primerNombre} ${datos.primerApellido}`,
          crear: (datos) => this.empleadosService.crear(datos),
        },
      })
      .afterClosed()
      .subscribe((recargar) => {
        if (recargar) this.empleadosService.cargar();
      });
  }

  // ============================================================
  // HISTORIAL GENERAL
  // ============================================================
  historialAbierto = signal(false);
  cargandoHistorial = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);

  abrirHistorialGeneral(): void {
    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.empleadosService.RetornarBitacoraGeneral('empleados').subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items.filter(tieneCambios));
        this.cargandoHistorial.set(false);
      },
      error: (err: Error) => {
        console.error('❌ Error bitácora empleados:', err);
        this.cargandoHistorial.set(false);
        this.notificaciones.error('No se pudo cargar la bitácora');
      },
    });
  }

  cerrarHistorialGeneral(): void {
    this.historialAbierto.set(false);
    this.bitacoraSignal.set([]);
  }

  accionLabel(idTipoAccion: number): string {
    return this.accionAuditoria.label(idTipoAccion);
  }

  accionClase(idTipoAccion: number): string {
    return this.accionAuditoria.clase(idTipoAccion);
  }

  accionIcono(idTipoAccion: number): string {
    return this.accionAuditoria.icono(idTipoAccion);
  }

  tablaLabel(tabla: string): string {
    if (tabla === 'empleados') return 'Empleado';
    return tabla;
  }

  tablaIcono(tabla: string): string {
    if (tabla === 'empleados') return 'badge';
    return 'description';
  }

  formatFechaHoraUTC(iso: string): string {
    if (!iso) return '—';
    const isoConZona = iso.endsWith('Z') ? iso : iso + 'Z';
    const fecha = new Date(isoConZona);
    if (isNaN(fecha.getTime())) return '—';
    return fecha.toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  usuarioLabel(idUsuario: number | null): string {
    if (idUsuario == null) return 'Sistema';
    const u = this.usuariosService.obtener(idUsuario);
    return u?.nombreUsuario ?? `Usuario #${idUsuario}`;
  }
}
