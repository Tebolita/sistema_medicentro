import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { CitaService } from '../../service/cita.service';
import { PacienteService } from '../../service/paciente.service';
import { EmpleadoService } from '../../service/empleado.service';
import { ExpedienteService } from '../../service/expediente.service';
import { RecetasService, RecetaInput, RecetaCompleta } from '../../service/recetas.service';
import { LaboratorioService, OrdenCompleta } from '../../service/laboratorio.service';
import { MedicamentosService } from '../../service/medicamentos.service';
import { InventarioFarmaciaService } from '../../service/inventario-farmacia.service';
import { CatalogoService } from '../../service/catalogo.service';
import { CatalogosService } from '../../service/catalogos.service';
import { ConstanciaService } from '../../service/constancia.service';
import { ActaService } from '../../service/acta.service';
import { Acta, ActaRequest } from '../../models/acta.model';
import { ActaDialog, ActaDialogResultado } from './dialogs/acta-dialog';
import { UsuariosService } from '../../service/usuarios.service';
import { ConfirmacionService } from '../../shared/confirmacion/confirmacion.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { AtencionCita, CitaRequest } from '../../models/cita.model';
import { PacienteListado } from '../../models/paciente.model';
import { Medico } from '../../models/medico.model';
import { CODIGOS_CATALOGO } from '../../models/catalogo.model';
import { ConstanciaMedica } from '../../models/constancia.model';
import { DatosConsultaDialog, DatosConsultaDialogResultado } from './dialogs/datos-consulta-dialog';
import { RecetaDialog, RecetaDialogResultado } from './dialogs/receta-dialog';
import { ExamenDialog, ExamenDialogResultado } from './dialogs/examen-dialog';
import { ConstanciaDialog, ConstanciaDialogResultado } from './dialogs/constancia-dialog';
import { HospitalizacionDialog, HospitalizacionDialogResultado } from './dialogs/hospitalizacion-dialog';
import { HospitalizacionesService, CamaOpcion } from '../../service/hospitalizaciones.service';
import { Hospitalizacion } from '../../models/hospitalizacion.model';
import { FacturasService, FacturaCompleta } from '../../service/facturas.service';
import { PermisosMenuService } from '../../service/permisos-menu.service';
import { OperacionDialog, OperacionDialogResultado } from '../../shared/operacion-dialog/operacion-dialog';

// El código del catálogo de estado de receta no está en CODIGOS_CATALOGO
// (vive en Farmacia, no en Citas) — se usa tal cual lo espera
// CatalogosService.idPorCodigo.
const CODIGO_ESTADO_RECETA = 'ESTADO_RECETA';
const CODIGO_UNIDAD_MEDIDA = 'UNIDAD_MEDIDA';
// Tipo de registro clínico por defecto para una consulta externa normal —
// el médico ya no elige esto, se resuelve solo (ver sembrar_catalogos.sql).
const CODIGO_TIPO_REGISTRO_DEFECTO = 'FICHA_EXTERNA';

function ahoraIsoLocal(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// Pantalla central pedida en SOLICITUD_MOTOR_CONSULTAS.md: desde una sola
// cita, el médico ve/registra los datos clínicos y puede agregar recetas,
// exámenes y (como enlace) una hospitalización — todo acoplado (colapsado)
// hasta que se le da clic a cada panel — y cierra con la constancia médica.
// Agregar datos nuevos abre un popup (ver carpeta dialogs/) en vez de un
// formulario siempre visible, para que cada panel se vea limpio: solo la
// tabla y un botón "Agregar".
@Component({
  selector: 'app-consulta-atencion',
  imports: [DatePipe, RouterLink, MatDialogModule, MatExpansionModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './consulta-atencion.html',
  styleUrl: './consulta-atencion.css',
})
export class ConsultaAtencion {
  private route = inject(ActivatedRoute);
  private dialog = inject(MatDialog);
  private citaService = inject(CitaService);
  private pacienteService = inject(PacienteService);
  private empleadoService = inject(EmpleadoService);
  private expedienteService = inject(ExpedienteService);
  private recetasService = inject(RecetasService);
  private laboratorioService = inject(LaboratorioService);
  private medicamentosService = inject(MedicamentosService);
  private inventarioFarmaciaService = inject(InventarioFarmaciaService);
  private catalogoService = inject(CatalogoService);
  private catalogosService = inject(CatalogosService);
  private constanciaService = inject(ConstanciaService);
  private actaService = inject(ActaService);
  private usuariosService = inject(UsuariosService);
  private hospitalizacionesService = inject(HospitalizacionesService);
  private facturasService = inject(FacturasService);
  private permisosMenu = inject(PermisosMenuService);
  private confirmacion = inject(ConfirmacionService);
  private notif = inject(NotificacionesService);

  idCita = Number(this.route.snapshot.paramMap.get('id'));

  // Si se llegó aquí desde el expediente de un paciente (ver
  // expedientes-lista.html, que manda ?paciente=X), "volver" regresa a las
  // consultas de ESE paciente en vez de a la lista general de consultas.
  idPacienteOrigen = this.route.snapshot.queryParamMap.get('paciente');
  volverLink = this.idPacienteOrigen ? ['/home/expedientes'] : ['/home/consultas'];
  volverQueryParams = this.idPacienteOrigen ? { paciente: this.idPacienteOrigen } : {};

  cargando = signal(true);
  errorCarga = signal('');
  atencion = signal<AtencionCita | null>(null);
  cita = computed(() => this.atencion()?.cita.cita ?? null);

  // "Marcar para operación" (SOLICITUD_MOTOR_CONSULTAS.md, sección 5): es
  // decisión del médico durante la atención, no de quien agenda la cita —
  // por eso vive aquí y no en el formulario de la consulta.
  puedeMarcarOperacion = computed(() => this.permisosMenu.tieneRol('MEDICO'));
  private tiposOperacionApi = this.catalogosService.obtener('TIPO_OPERACION');
  nombreTipoOperacion = computed(
    () => this.tiposOperacionApi().find((t) => t.id === this.cita()?.idTipoOperacion)?.nombre ?? null,
  );

  private pacientes = signal<PacienteListado[]>([]);
  private medicos = signal<Medico[]>([]);

  nombrePaciente = computed(() => {
    const p = this.pacientes().find((x) => x.idPaciente === this.cita()?.idPaciente);
    return p ? `${p.primerNombre} ${p.primerApellido}` : '—';
  });
  nombreMedico = computed(() => {
    const m = this.medicos().find((x) => x.idEmpleado === this.cita()?.idMedico);
    return m?.nombreCompleto ?? '—';
  });

  expedientes = computed(() => this.atencion()?.expedientes ?? []);

  // ==================== Resumen rápido (debajo del encabezado) ====================
  // El motivo ya no se edita en "Datos de la consulta" — se muestra aquí,
  // tal como lo capturó recepción (o la emergencia que originó la cita).
  motivoResumen = computed(() => {
    const motivo = this.expedientes()[0]?.motivoConsulta ?? this.cita()?.motivoConsulta;
    return motivo?.trim() || 'Sin motivo';
  });

  notasResumen = computed(() => {
    const notas = this.expedientes()[0]?.notas;
    return notas?.trim() || 'Sin notas';
  });

  usuarioRegistroResumen = computed(() => {
    const expediente = this.expedientes()[0];
    if (!expediente) {
      return 'Sin registrar aún';
    }
    const id = expediente.idUsuarioModificacion ?? expediente.idUsuarioCreacion;
    if (!id) {
      return 'Sin registrar aún';
    }
    return this.usuariosService.obtener(id)?.nombreUsuario ?? `Usuario #${id}`;
  });
  recetas = computed(() => this.atencion()?.recetas ?? []);
  ordenesLaboratorio = computed(() => this.atencion()?.ordenesLaboratorio ?? []);

  // ==================== Buscadores y filtros de las tablas ====================
  buscarReceta = signal('');
  buscarExamen = signal('');

  // Nada se oculta de verdad: "todas" siempre está disponible — estos
  // filtros solo le dan al médico un apartado rápido para ver únicamente lo
  // vigente/pendiente o únicamente lo anulado/completado, sin perder acceso
  // a lo demás (lo pedido: anuladas y completados SIEMPRE se pueden ver).
  filtroReceta = signal<'todas' | 'vigentes' | 'anuladas'>('todas');
  filtroExamen = signal<'todas' | 'pendientes' | 'completados'>('todas');

  // Una fila por medicamento (hoy cada receta nace con un solo detalle,
  // pero si alguna vez tiene más, cada uno sale en su propia fila).
  filasRecetaTodas = computed(() => {
    const filas: { receta: RecetaCompleta; detalle: RecetaCompleta['detalles'][number] }[] = [];
    for (const r of this.recetas()) {
      for (const d of r.detalles) {
        filas.push({ receta: r, detalle: d });
      }
    }
    return filas;
  });

  cantidadAnuladas = computed(() => this.filasRecetaTodas().filter((f) => this.recetaAnulada(f.receta.receta.idEstadoReceta)).length);

  filasReceta = computed(() => {
    const term = this.buscarReceta().trim().toLowerCase();
    const filtro = this.filtroReceta();
    return this.filasRecetaTodas().filter((f) => {
      const anulada = this.recetaAnulada(f.receta.receta.idEstadoReceta);
      if (filtro === 'vigentes' && anulada) return false;
      if (filtro === 'anuladas' && !anulada) return false;
      if (
        term &&
        !this.nombreMedicamento(f.detalle.idMedicamento, f.detalle.nombreMedicamentoExterno).toLowerCase().includes(term)
      )
        return false;
      return true;
    });
  });

  // Selección para imprimir: el médico marca los medicamentos que quiere en
  // UNA receta impresa — pueden ser de varias recetas distintas, o solo uno
  // (ver pedido: "imprimir ciertos medicamentos en una sola receta... o
  // sacar solo 1 medicamento en otra"). Se guarda por idRecetaDetalle.
  seleccionRecetas = signal<Set<number>>(new Set());

  estaSeleccionada(idRecetaDetalle: number): boolean {
    return this.seleccionRecetas().has(idRecetaDetalle);
  }

  toggleSeleccion(idRecetaDetalle: number): void {
    this.seleccionRecetas.update((s) => {
      const nuevo = new Set(s);
      if (nuevo.has(idRecetaDetalle)) {
        nuevo.delete(idRecetaDetalle);
      } else {
        nuevo.add(idRecetaDetalle);
      }
      return nuevo;
    });
  }

  cantidadSeleccionada = computed(() => this.seleccionRecetas().size);

  // Check de "seleccionar todos" — solo sobre lo que se está viendo ahora
  // (respeta el buscador/filtro activo), para no seleccionar a ciegas algo
  // que el médico no ve en pantalla.
  todosSeleccionados = computed(() => {
    const filas = this.filasReceta();
    return filas.length > 0 && filas.every((f) => this.estaSeleccionada(f.detalle.idRecetaDetalle));
  });

  toggleSeleccionarTodos(): void {
    const filas = this.filasReceta();
    const marcarTodos = !this.todosSeleccionados();
    this.seleccionRecetas.update((s) => {
      const nuevo = new Set(s);
      for (const f of filas) {
        if (marcarTodos) {
          nuevo.add(f.detalle.idRecetaDetalle);
        } else {
          nuevo.delete(f.detalle.idRecetaDetalle);
        }
      }
      return nuevo;
    });
  }

  filasExamenTodas = computed(() => {
    const filas: { orden: OrdenCompleta['orden']; detalle: AtencionCita['ordenesLaboratorio'][number]['detalles'][number] }[] = [];
    for (const o of this.ordenesLaboratorio()) {
      for (const d of o.detalles) {
        filas.push({ orden: o.orden, detalle: d });
      }
    }
    return filas;
  });

  cantidadCompletados = computed(() => this.filasExamenTodas().filter((f) => f.detalle.resultados.length > 0).length);

  filasExamen = computed(() => {
    const term = this.buscarExamen().trim().toLowerCase();
    const filtro = this.filtroExamen();
    return this.filasExamenTodas().filter((f) => {
      const completado = f.detalle.resultados.length > 0;
      if (filtro === 'pendientes' && completado) return false;
      if (filtro === 'completados' && !completado) return false;
      if (term && !this.nombreTipoExamen(f.detalle.idTipoExamen).toLowerCase().includes(term)) return false;
      return true;
    });
  });

  // ==================== Datos clínicos ====================
  // Se resuelve solo (FICHA_EXTERNA): el médico ya no elige el tipo de
  // registro, solo escribe el diagnóstico (ver pedido del usuario).
  private idTipoRegistroDefault: number | null = null;

  // ==================== Recetario ====================
  medicamentos = this.medicamentosService.listar;
  itemsInventario = this.inventarioFarmaciaService.listar;
  unidadesMedida = signal<{ id: number; label: string }[]>([]);

  // Recetas vigentes (no anuladas) de esta cita, para que el popup de
  // "agregar medicamento" pueda sumarlas a una existente en vez de crear
  // otra (ver SOLICITUD_MOTOR_CONSULTAS.md: "una receta puede tener n
  // medicamentos, solo se genera otra si hace falta").
  recetasVigentesParaDestino = computed(() =>
    this.recetas()
      .filter((r) => !this.recetaAnulada(r.receta.idEstadoReceta))
      .map((r) => ({
        idReceta: r.receta.idReceta,
        resumen: `${r.detalles.length} medicamento${r.detalles.length === 1 ? '' : 's'}`,
      })),
  );

  // ==================== Exámenes ====================
  tiposExamen = signal<{ idTipoExamen: number; nombre: string }[]>([]);
  prioridades = signal<{ id: number; label: string }[]>([]);
  private estadoOrdenInicial: number | null = null;

  // Mismo criterio que recetasVigentesParaDestino: cualquier orden de esta
  // cita puede recibir otro examen más.
  ordenesVigentesParaDestino = computed(() =>
    this.ordenesLaboratorio().map((o) => ({
      idOrden: o.orden.idOrden,
      resumen: `${o.detalles.length} examen${o.detalles.length === 1 ? '' : 'es'}`,
    })),
  );

  // ==================== Constancia médica ====================
  constancia = signal<ConstanciaMedica | null>(null);

  // ==================== Acta de cierre ====================
  // Ya no se llena suelta en Recepción al ingreso (ver
  // SOLICITUD_MOTOR_CONSULTAS.md): se genera aquí, al cerrar la consulta.
  acta = signal<Acta | null>(null);

  // ==================== Factura automática ====================
  // Nace en Q0 al crear la cita y se va completando sola con los
  // medicamentos de receta que se agreguen (ver SOLICITUD_MOTOR_CONSULTAS.md).
  factura = signal<FacturaCompleta | null>(null);

  constructor() {
    if (!this.idCita) {
      this.errorCarga.set('Cita inválida.');
      this.cargando.set(false);
      return;
    }

    this.medicamentosService.cargar();
    this.inventarioFarmaciaService.cargar();

    forkJoin({
      atencion: this.citaService.RetornarAtencionCita(this.idCita),
      pacientes: this.pacienteService.RetornarPacientes(),
      medicos: this.empleadoService.RetornarMedicos(),
      tiposRegistro: this.catalogoService.RetornarCatalogo(CODIGOS_CATALOGO.TIPO_REGISTRO_CLINICO),
      unidadesMedida: this.catalogoService.RetornarCatalogo(CODIGO_UNIDAD_MEDIDA),
      tiposExamen: this.laboratorioService.RetornarTiposExamen(),
      prioridades: this.laboratorioService.RetornarPrioridades(),
      estadosOrden: this.laboratorioService.RetornarEstadosOrden(),
      constancia: this.constanciaService.RetornarPorCita(this.idCita),
      acta: this.actaService.RetornarPorCita(this.idCita),
      camas: this.hospitalizacionesService.RetornarCamas(),
      // Mejor sin factura visible que romper toda la pantalla si este
      // endpoint falla por cualquier motivo — no es información crítica.
      factura: this.facturasService.RetornarPorCita(this.idCita).pipe(catchError(() => of(null))),
    }).subscribe({
      next: (r) => {
        this.atencion.set(r.atencion.datos ?? null);
        this.pacientes.set(r.pacientes.datos ?? []);
        this.medicos.set(r.medicos.datos ?? []);
        this.camas.set(r.camas);
        this.factura.set(r.factura);
        const tiposRegistro = r.tiposRegistro.datos ?? [];
        this.idTipoRegistroDefault =
          tiposRegistro.find((t) => t.codigo === CODIGO_TIPO_REGISTRO_DEFECTO)?.id ?? tiposRegistro[0]?.id ?? null;
        this.unidadesMedida.set((r.unidadesMedida.datos ?? []).map((c) => ({ id: c.id, label: c.nombre })));
        this.tiposExamen.set(r.tiposExamen.map((t) => ({ idTipoExamen: t.idTipoExamen, nombre: t.nombre })));
        this.prioridades.set(r.prioridades.map((p) => ({ id: p.id, label: p.label })));
        this.estadoOrdenInicial = r.estadosOrden[0]?.id ?? null;
        this.constancia.set(r.constancia);
        this.acta.set(r.acta);
        this.cargando.set(false);
      },
      error: (err: Error) => {
        this.errorCarga.set('No se pudo cargar la atención de esta consulta: ' + err.message);
        this.cargando.set(false);
      },
    });
  }

  // ==================== Datos clínicos ====================
  abrirDialogoDatos(): void {
    const existente = this.expedientes()[0] ?? null;
    this.dialog
      .open(DatosConsultaDialog, {
        autoFocus: false,
        data: { idTipoRegistroDefault: this.idTipoRegistroDefault, valorInicial: existente },
      })
      .afterClosed()
      .subscribe((resultado: DatosConsultaDialogResultado | null) => {
        if (resultado) {
          this.guardarDatos(resultado);
        }
      });
  }

  private guardarDatos(v: DatosConsultaDialogResultado): void {
    const cita = this.cita();
    if (!cita) return;
    const existente = this.expedientes()[0];

    const request = {
      idPaciente: cita.idPaciente,
      idMedico: cita.idMedico,
      idCita: cita.idCita,
      idTratamiento: existente?.idTratamiento ?? null,
      idTipoRegistro: v.idTipoRegistro,
      idNivelConfidencialidad: v.idNivelConfidencialidad,
      fecha: existente?.fecha ?? ahoraIsoLocal(),
      // Ya no se edita aquí: se lleva el motivo de la cita (recepción o la
      // emergencia que la originó) tal cual, sin pedírselo al médico.
      motivoConsulta: cita.motivoConsulta,
      diagnostico: v.diagnostico,
      notas: v.notas,
    };

    const peticion = existente
      ? this.expedienteService.ActualizarExpediente(existente.idHistorial, request)
      : this.expedienteService.CrearExpediente(request);

    peticion.subscribe({
      next: (resp) => {
        this.notif.exito('Datos de la consulta guardados');
        if (resp.datos) {
          const nuevo = resp.datos;
          this.atencion.update((a) =>
            a ? { ...a, expedientes: existente ? a.expedientes.map((e) => (e.idHistorial === nuevo.idHistorial ? nuevo : e)) : [nuevo, ...a.expedientes] } : a,
          );
        }
      },
      error: (err: HttpErrorResponse) => {
        this.notif.error('No se pudieron guardar los datos: ' + (err.error?.mensaje ?? err.message));
      },
    });
  }

  // ==================== Marcar para operación ====================
  abrirDialogoOperacion(): void {
    const cita = this.cita();
    if (!cita) return;

    this.dialog
      .open(OperacionDialog, {
        autoFocus: false,
        data: { idTipoOperacion: cita.idTipoOperacion, notasOperacion: cita.notasOperacion },
      })
      .afterClosed()
      .subscribe((resultado: OperacionDialogResultado | null) => {
        if (resultado) this.guardarOperacion(true, resultado.idTipoOperacion, resultado.notasOperacion);
      });
  }

  quitarOperacion(): void {
    this.guardarOperacion(false, null, null);
  }

  private guardarOperacion(requiereOperacion: boolean, idTipoOperacion: number | null, notasOperacion: string | null): void {
    const cita = this.cita();
    if (!cita) return;

    const request: CitaRequest = {
      idPaciente: cita.idPaciente,
      idMedico: cita.idMedico,
      idEspecialidad: cita.idEspecialidad,
      idSala: cita.idSala,
      fechaHoraInicio: cita.fechaHoraInicio,
      fechaHoraFin: cita.fechaHoraFin,
      idEstadoCita: cita.idEstadoCita,
      idMotivoCancelacion: cita.idMotivoCancelacion,
      motivoConsulta: cita.motivoConsulta,
      notas: cita.notas,
      idPoliza: cita.idPoliza,
      requiereOperacion,
      idTipoOperacion,
      notasOperacion,
      motivoCambio: 'Actualizado desde la atención de la consulta',
    };

    this.citaService.ActualizarCita(cita.idCita, request).subscribe({
      next: (resp) => {
        this.notif.exito(requiereOperacion ? 'Consulta marcada para operación' : 'Se quitó la marca de operación');
        const citaActualizada = resp.datos?.cita;
        if (citaActualizada) {
          this.atencion.update((a) => (a ? { ...a, cita: { ...a.cita, cita: citaActualizada } } : a));
        }
      },
      error: (err: HttpErrorResponse) =>
        this.notif.error('No se pudo actualizar la marca de operación: ' + (err.error?.mensaje ?? err.message)),
    });
  }

  // ==================== Recetario ====================
  abrirDialogoReceta(): void {
    this.dialog
      .open(RecetaDialog, {
        autoFocus: false,
        data: {
          medicamentos: this.medicamentos(),
          itemsInventario: this.itemsInventario(),
          unidadesMedida: this.unidadesMedida(),
          recetasVigentes: this.recetasVigentesParaDestino(),
        },
      })
      .afterClosed()
      .subscribe((resultado: RecetaDialogResultado | null) => {
        if (resultado) {
          this.agregarReceta(resultado);
        }
      });
  }

  private agregarReceta(v: RecetaDialogResultado): void {
    const cita = this.cita();
    if (!cita) return;

    const nuevoDetalle = {
      idRecetaDetalle: 0,
      idMedicamento: v.idMedicamento,
      nombreMedicamentoExterno: v.nombreMedicamentoExterno,
      cantidad: v.cantidad,
      dosis: v.dosis,
      frecuencia: v.frecuencia,
      duracion: v.duracion,
      indicaciones: v.indicaciones,
    };

    // Agregar a una receta ya vigente: se le suma esta línea a las que ya
    // tenía (ver SOLICITUD_MOTOR_CONSULTAS.md — una receta con n medicamentos).
    if (v.idRecetaDestino !== null) {
      const destino = this.recetas().find((r) => r.receta.idReceta === v.idRecetaDestino);
      if (!destino) {
        this.notif.error('No se encontró la receta seleccionada.');
        return;
      }
      const input: RecetaInput = {
        idTratamiento: destino.receta.idTratamiento,
        idPaciente: destino.receta.idPaciente,
        idMedico: destino.receta.idMedico,
        idCita: destino.receta.idCita,
        fechaEmision: destino.receta.fechaEmision,
        firmaDigitalHash: destino.receta.firmaDigitalHash,
        firmaDigitalUrl: destino.receta.firmaDigitalUrl,
        idEstadoReceta: destino.receta.idEstadoReceta,
        detalles: [...destino.detalles, nuevoDetalle],
      };
      this.recetasService.actualizar(destino.receta.idReceta, input).subscribe({
        next: (editada) => {
          this.notif.exito('Medicamento agregado a la receta');
          this.atencion.update((a) =>
            a ? { ...a, recetas: a.recetas.map((r) => (r.receta.idReceta === editada.receta.idReceta ? editada : r)) } : a,
          );
          this.recargarFactura();
        },
        error: (err: Error) => this.notif.error('No se pudo agregar el medicamento: ' + err.message),
      });
      return;
    }

    // Sin receta destino: se crea una nueva.
    const idEstadoEmitida = this.catalogosService.idPorCodigo(CODIGO_ESTADO_RECETA, 'EMITIDA');
    if (idEstadoEmitida === undefined) {
      this.notif.error('El catálogo de estado de receta todavía está cargando, intenta de nuevo en un momento.');
      return;
    }

    const input: RecetaInput = {
      idTratamiento: null,
      idPaciente: cita.idPaciente,
      idMedico: cita.idMedico,
      idCita: cita.idCita,
      fechaEmision: ahoraIsoLocal(),
      firmaDigitalHash: null,
      firmaDigitalUrl: null,
      idEstadoReceta: idEstadoEmitida,
      detalles: [nuevoDetalle],
    };

    this.recetasService.crear(input).subscribe({
      next: (nueva) => {
        this.notif.exito('Receta agregada');
        this.atencion.update((a) => (a ? { ...a, recetas: [nueva, ...a.recetas] } : a));
        this.recargarFactura();
      },
      error: (err: Error) => this.notif.error('No se pudo agregar la receta: ' + err.message),
    });
  }

  // La factura se recalcula sola en el backend cada vez que se
  // agrega/edita/anula un medicamento de receta de esta cita; esto solo
  // refresca lo que se ve en pantalla para que no haya que recargar la
  // página (ver SOLICITUD_MOTOR_CONSULTAS.md).
  private recargarFactura(): void {
    if (!this.idCita) return;
    this.facturasService.RetornarPorCita(this.idCita).subscribe({
      next: (f) => this.factura.set(f),
      error: () => {},
    });
  }

  // Imprime SOLO los medicamentos marcados — pueden venir de recetas
  // distintas, o ser uno solo. No se guarda ningún archivo: la vista se
  // genera al vuelo cada vez, así que se puede reimprimir (con la selección
  // que sea) cuantas veces haga falta.
  imprimirSeleccionados(): void {
    const ids = this.seleccionRecetas();
    const detalles = this.filasRecetaTodas()
      .filter((f) => ids.has(f.detalle.idRecetaDetalle))
      .map((f) => f.detalle);
    if (detalles.length === 0) {
      this.notif.error('Selecciona al menos un medicamento para imprimir.');
      return;
    }
    this.imprimirMedicamentos(detalles);
  }

  private imprimirMedicamentos(detalles: RecetaCompleta['detalles']): void {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fecha = new Date().toLocaleDateString('es-GT', { day: '2-digit', month: 'long', year: 'numeric' });
    const filas = detalles
      .map(
        (d) => `
      <tr>
        <td>${esc(this.nombreMedicamento(d.idMedicamento, d.nombreMedicamentoExterno))}</td>
        <td>${esc(d.dosis)}</td>
        <td>${esc(d.frecuencia)}</td>
        <td>${esc(d.duracion ?? '—')}</td>
        <td>${esc(d.indicaciones ?? '—')}</td>
      </tr>`,
      )
      .join('');

    const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Receta</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; padding: 32px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .subtitulo { color: #666; font-size: 12px; margin: 0 0 20px; }
  .encabezado { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 20px; font-size: 13px; border-bottom: 1px solid #ddd; padding-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; font-size: 13px; }
  th { background: #f3f3f3; }
  .pie { margin-top: 32px; font-size: 12px; color: #666; }
</style>
</head>
<body>
  <h1>Receta médica</h1>
  <p class="subtitulo">Sanatorio Medicentro</p>
  <div class="encabezado">
    <span><strong>Paciente:</strong> ${esc(this.nombrePaciente())}</span>
    <span><strong>Médico:</strong> ${esc(this.nombreMedico())}</span>
    <span><strong>Fecha:</strong> ${esc(fecha)}</span>
  </div>
  <table>
    <thead>
      <tr><th>Medicamento</th><th>Dosis</th><th>Frecuencia</th><th>Duración</th><th>Indicaciones</th></tr>
    </thead>
    <tbody>${filas}</tbody>
  </table>
  <p class="pie">Generada el ${new Date().toLocaleString('es-GT')}</p>
</body>
</html>`;

    const ventana = window.open('', '_blank', 'width=800,height=600');
    if (!ventana) {
      this.notif.error('El navegador bloqueó la ventana de impresión. Habilita las ventanas emergentes e intenta de nuevo.');
      return;
    }
    ventana.document.write(html);
    ventana.document.close();
    ventana.focus();
    ventana.print();
  }

  nombreMedicamento(idMedicamento: number | null, nombreMedicamentoExterno?: string | null): string {
    if (idMedicamento === null) {
      return nombreMedicamentoExterno ? `${nombreMedicamentoExterno} (externo)` : 'Medicamento externo';
    }
    return this.medicamentos().find((m) => m.idMedicamento === idMedicamento)?.nombre ?? `#${idMedicamento}`;
  }

  recetaAnulada(idEstadoReceta: number): boolean {
    return this.catalogosService.idPorCodigo(CODIGO_ESTADO_RECETA, 'CANCELADA') === idEstadoReceta;
  }

  async anularReceta(receta: RecetaCompleta): Promise<void> {
    const idCancelada = this.catalogosService.idPorCodigo(CODIGO_ESTADO_RECETA, 'CANCELADA');
    if (idCancelada === undefined) {
      this.notif.error('El catálogo de estado de receta todavía está cargando, intenta de nuevo en un momento.');
      return;
    }
    if (!(await this.confirmacion.confirmar('¿Anular esta receta?', { peligroso: true }))) {
      return;
    }

    const input: RecetaInput = {
      idTratamiento: receta.receta.idTratamiento,
      idPaciente: receta.receta.idPaciente,
      idMedico: receta.receta.idMedico,
      idCita: receta.receta.idCita,
      fechaEmision: receta.receta.fechaEmision,
      firmaDigitalHash: receta.receta.firmaDigitalHash,
      firmaDigitalUrl: receta.receta.firmaDigitalUrl,
      idEstadoReceta: idCancelada,
      detalles: receta.detalles,
    };

    this.recetasService.actualizar(receta.receta.idReceta, input).subscribe({
      next: (editada) => {
        this.notif.exito('Receta anulada');
        this.atencion.update((a) =>
          a ? { ...a, recetas: a.recetas.map((r) => (r.receta.idReceta === editada.receta.idReceta ? editada : r)) } : a,
        );
        this.recargarFactura();
      },
      error: (err: Error) => this.notif.error('No se pudo anular la receta: ' + err.message),
    });
  }

  // ==================== Exámenes ====================
  abrirDialogoExamen(): void {
    this.dialog
      .open(ExamenDialog, {
        autoFocus: false,
        data: {
          tiposExamen: this.tiposExamen(),
          prioridades: this.prioridades(),
          ordenesVigentes: this.ordenesVigentesParaDestino(),
        },
      })
      .afterClosed()
      .subscribe((resultado: ExamenDialogResultado | null) => {
        if (resultado) {
          this.agregarExamen(resultado);
        }
      });
  }

  private agregarExamen(v: ExamenDialogResultado): void {
    const cita = this.cita();
    if (!cita || this.estadoOrdenInicial === null) return;

    const ahora = ahoraIsoLocal();
    const nuevoDetalle = { idOrdenDetalle: 0, idOrden: 0, idTipoExamen: v.idTipoExamen, activo: true, fechaCreacion: ahora };

    // Agregar a una orden ya existente de esta cita (n exámenes por orden).
    if (v.idOrdenDestino !== null) {
      const destino = this.ordenesLaboratorio().find((o) => o.orden.idOrden === v.idOrdenDestino);
      if (!destino) {
        this.notif.error('No se encontró la orden seleccionada.');
        return;
      }
      const registroExistente: OrdenCompleta = {
        orden: destino.orden,
        detalles: [...destino.detalles, nuevoDetalle],
      };
      this.laboratorioService.guardar(registroExistente).subscribe({
        next: (resp) => {
          this.notif.exito('Examen agregado a la orden');
          const datos: any = resp.datos;
          const plano: OrdenCompleta =
            datos?.orden && typeof datos.orden === 'object'
              ? { orden: datos.orden, detalles: datos.detalles ?? [] }
              : { orden: datos, detalles: datos?.detalles ?? [] };
          // Los resultados de los detalles que ya existían no vienen en esta
          // respuesta: se conservan los que ya se tenían en pantalla.
          const completo = {
            orden: plano.orden,
            detalles: plano.detalles.map((d) => ({
              ...d,
              resultados: destino.detalles.find((existente) => existente.idOrdenDetalle === d.idOrdenDetalle)?.resultados ?? [],
            })),
          };
          this.atencion.update((a) =>
            a ? { ...a, ordenesLaboratorio: a.ordenesLaboratorio.map((o) => (o.orden.idOrden === completo.orden.idOrden ? completo : o)) } : a,
          );
        },
        error: (err: HttpErrorResponse) => this.notif.error('No se pudo agregar el examen: ' + (err.error?.mensaje ?? err.message)),
      });
      return;
    }

    const registro: OrdenCompleta = {
      orden: {
        idOrden: 0,
        idPaciente: cita.idPaciente,
        idMedico: cita.idMedico,
        idCita: cita.idCita,
        fechaOrden: ahora,
        idPrioridad: v.idPrioridad,
        idEstadoOrden: this.estadoOrdenInicial,
        notas: null,
        activo: true,
        fechaCreacion: ahora,
        fechaModificacion: null,
        idUsuarioCreacion: null,
        idUsuarioModificacion: null,
      },
      detalles: [nuevoDetalle],
    };

    this.laboratorioService.guardar(registro).subscribe({
      next: (resp) => {
        this.notif.exito('Examen solicitado');
        const datos: any = resp.datos;
        const plano: OrdenCompleta =
          datos?.orden && typeof datos.orden === 'object'
            ? { orden: datos.orden, detalles: datos.detalles ?? [] }
            : { orden: datos, detalles: datos?.detalles ?? [] };
        // Recién creada: todavía no tiene resultados.
        const completo = { orden: plano.orden, detalles: plano.detalles.map((d) => ({ ...d, resultados: [] })) };
        this.atencion.update((a) => (a ? { ...a, ordenesLaboratorio: [completo, ...a.ordenesLaboratorio] } : a));
      },
      error: (err: HttpErrorResponse) => {
        this.notif.error('No se pudo solicitar el examen: ' + (err.error?.mensaje ?? err.message));
      },
    });
  }

  nombreTipoExamen(idTipoExamen: number): string {
    return this.tiposExamen().find((t) => t.idTipoExamen === idTipoExamen)?.nombre ?? `#${idTipoExamen}`;
  }

  // ==================== Constancia médica ====================
  abrirDialogoConstancia(): void {
    const existente = this.constancia();
    this.dialog
      .open(ConstanciaDialog, {
        autoFocus: false,
        data: { valorInicial: existente ? { diagnostico: existente.diagnostico, contenido: existente.contenido } : null },
      })
      .afterClosed()
      .subscribe((resultado: ConstanciaDialogResultado | null) => {
        if (resultado) {
          this.guardarConstancia(resultado);
        }
      });
  }

  private guardarConstancia(v: ConstanciaDialogResultado): void {
    const cita = this.cita();
    if (!cita) return;

    const request = {
      idCita: cita.idCita,
      idPaciente: cita.idPaciente,
      idMedico: cita.idMedico,
      diagnostico: v.diagnostico,
      contenido: v.contenido,
    };

    const existente = this.constancia();
    const peticion = existente
      ? this.constanciaService.actualizar(existente.idConstancia, request)
      : this.constanciaService.crear(request);

    peticion.subscribe({
      next: (nueva) => {
        this.notif.exito('Constancia guardada');
        this.constancia.set(nueva);
      },
      error: (err: Error) => this.notif.error('No se pudo guardar la constancia: ' + err.message),
    });
  }

  // ==================== Acta de cierre ====================
  abrirDialogoActa(): void {
    const cita = this.cita();
    if (!cita) return;
    const existente = this.acta();

    this.dialog
      .open(ActaDialog, {
        autoFocus: false,
        data: {
          esNueva: !existente,
          motivoConsulta: cita.motivoConsulta,
          observacionesIniciales: existente?.observaciones ?? null,
        },
      })
      .afterClosed()
      .subscribe((resultado: ActaDialogResultado | null) => {
        if (resultado) this.guardarActa(resultado);
      });
  }

  private guardarActa(v: ActaDialogResultado): void {
    const cita = this.cita();
    if (!cita) return;

    const request: ActaRequest = {
      idPaciente: cita.idPaciente,
      idCita: cita.idCita,
      motivoIngreso: cita.motivoConsulta || 'Consulta externa',
      idAtendidoPor: cita.idMedico,
      observaciones: v.observaciones,
    };

    const existente = this.acta();
    const peticion = existente
      ? this.actaService.ActualizarActa(existente.idActa, request)
      : this.actaService.CrearActa(request);

    peticion.subscribe({
      next: (resp) => {
        this.notif.exito('Acta guardada');
        if (resp.datos) this.acta.set(resp.datos);
      },
      error: (err: HttpErrorResponse) => this.notif.error('No se pudo guardar el acta: ' + (err.error?.mensaje ?? err.message)),
    });
  }

  // ==================== Hospitalización ====================
  // Se inicia desde esta misma pantalla, no en el módulo aparte — paciente
  // y médico responsable ya se conocen (son los de la consulta). Queda
  // guardada con idCita (ver sección 8 de motor_consultas_schema.sql), así
  // que al volver a abrir esta pantalla se ve que ya se inició, en vez de
  // perderse (solo vivía en memoria antes de este cambio).
  private camas = signal<CamaOpcion[]>([]);

  hospitalizacionIniciada = computed(() => {
    const h = this.atencion()?.hospitalizaciones[0];
    if (!h) return null;
    const camaLabel = this.camas().find((c) => c.id === h.idCama)?.label ?? `#${h.idCama}`;
    return { hospitalizacion: h, camaLabel };
  });

  abrirDialogoHospitalizacion(): void {
    // No se usa RetornarCamasLibres() porque filtra con idPorCodigo() leyendo
    // una caché interna del servicio que nadie garantiza que ya esté
    // poblada en esta pantalla (hospitalizacion-formulario.ts sí la
    // precarga antes; aquí no pasábamos por ahí) — se resuelve el código
    // 'LIBRE' aparte, de una vez, para no depender de ese orden.
    forkJoin({
      camas: this.hospitalizacionesService.RetornarCamas(),
      estadosCama: this.catalogoService.RetornarCatalogo('ESTADO_CAMA'),
    }).subscribe({
      next: ({ camas, estadosCama }) => {
        this.camas.set(camas);
        const idLibre = (estadosCama.datos ?? []).find((e) => e.codigo === 'LIBRE')?.id;
        const camasLibres = idLibre !== undefined ? camas.filter((c) => c.idEstadoCama === idLibre) : [];

        this.dialog
          .open(HospitalizacionDialog, {
            autoFocus: false,
            data: {
              camasLibres,
              motivoIngresoPorDefecto: this.expedientes()[0]?.diagnostico ?? this.cita()?.motivoConsulta ?? null,
            },
          })
          .afterClosed()
          .subscribe((resultado: HospitalizacionDialogResultado | null) => {
            if (resultado) {
              this.guardarHospitalizacion(resultado);
            }
          });
      },
      error: (err: HttpErrorResponse) => this.notif.error('No se pudieron cargar las camas libres: ' + (err.error?.mensaje ?? err.message)),
    });
  }

  private guardarHospitalizacion(v: HospitalizacionDialogResultado): void {
    const cita = this.cita();
    if (!cita) return;

    // Mismo motivo que con 'LIBRE': se resuelve del lote recién pedido, sin
    // depender de la caché interna del servicio.
    this.catalogoService.RetornarCatalogo('ESTADO_HOSPITALIZACION').subscribe({
      next: (resp) => {
        const estados = resp.datos ?? [];
        const idEstadoActiva = estados.find((e) => e.codigo === 'ACTIVA')?.id ?? estados[0]?.id ?? null;
        if (idEstadoActiva === null) {
          this.notif.error('No se pudo resolver el estado de la hospitalización.');
          return;
        }

        const ahora = ahoraIsoLocal();
        const registro: Hospitalizacion = {
          idHospitalizacion: 0,
          idPaciente: cita.idPaciente,
          idCita: cita.idCita,
          idCama: v.idCama,
          idMedicoResponsable: cita.idMedico,
          fechaIngreso: ahora,
          fechaEgreso: null,
          motivoIngreso: v.motivoIngreso,
          diagnosticoEgreso: null,
          idEstadoHospitalizacion: idEstadoActiva,
          activo: true,
          fechaCreacion: ahora,
          fechaModificacion: null,
          idUsuarioCreacion: null,
          idUsuarioModificacion: null,
        };

        this.hospitalizacionesService.guardar(registro).subscribe({
          next: (resp) => {
            this.notif.exito('Hospitalización iniciada');
            const datos: any = resp.datos;
            const nueva: Hospitalizacion =
              datos?.hospitalizacion && typeof datos.hospitalizacion === 'object' ? datos.hospitalizacion : datos;
            this.atencion.update((a) => (a ? { ...a, hospitalizaciones: [nueva, ...a.hospitalizaciones] } : a));
          },
          error: (err: HttpErrorResponse) => this.notif.error('No se pudo iniciar la hospitalización: ' + (err.error?.mensaje ?? err.message)),
        });
      },
      error: (err: HttpErrorResponse) => this.notif.error('No se pudo cargar el estado de hospitalización: ' + (err.error?.mensaje ?? err.message)),
    });
  }
}
