import { Component, computed, effect, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule } from '@angular/material/menu';
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
import { FichaConsultaExternaAdultoService } from '../../service/ficha-consulta-externa-adulto.service';
import { FichaConsultaExternaAdulto } from '../../models/ficha-consulta-externa-adulto.model';
import {
  FichaConsultaExternaAdultoDialog,
  FichaConsultaExternaAdultoDialogResultado,
} from './dialogs/ficha-consulta-externa-adulto-dialog';
import { VacunaAplicadaService } from '../../service/vacuna-aplicada.service';
import { VacunaAplicada } from '../../models/vacuna-aplicada.model';
import { VacunaDialog, VacunaDialogResultado } from './dialogs/vacuna-dialog';
import { OrdenMedicaConsultaService } from '../../service/orden-medica-consulta.service';
import { OrdenMedicaConsulta } from '../../models/orden-medica-consulta.model';
import {
  OrdenMedicaConsultaDialog,
  OrdenMedicaConsultaDialogResultado,
} from './dialogs/orden-medica-consulta-dialog';
import { NotaEvolucionConsultaService } from '../../service/nota-evolucion-consulta.service';
import { NotaEvolucionConsulta } from '../../models/nota-evolucion-consulta.model';
import {
  NotaEvolucionConsultaDialog,
  NotaEvolucionConsultaDialogResultado,
} from './dialogs/nota-evolucion-consulta-dialog';
import { NotaEnfermeriaConsultaService } from '../../service/nota-enfermeria-consulta.service';
import { NotaEnfermeriaConsulta } from '../../models/nota-enfermeria-consulta.model';
import {
  NotaEnfermeriaConsultaDialog,
  NotaEnfermeriaConsultaDialogResultado,
} from './dialogs/nota-enfermeria-consulta-dialog';
import { ControlSignosConsultaService } from '../../service/control-signos-consulta.service';
import { ControlSignosConsulta } from '../../models/control-signos-consulta.model';
import {
  ControlSignosConsultaDialog,
  ControlSignosConsultaDialogResultado,
} from './dialogs/control-signos-consulta-dialog';
import { CostoPacienteConsultaService } from '../../service/costo-paciente-consulta.service';
import { CostoPacienteConsulta } from '../../models/costo-paciente-consulta.model';
import {
  CostoPacienteConsultaDialog,
  CostoPacienteConsultaDialogResultado,
} from './dialogs/costo-paciente-consulta-dialog';
import { FichaClinicaGeneralService } from '../../service/ficha-clinica-general.service';
import { FichaClinicaGeneral } from '../../models/ficha-clinica-general.model';
import {
  FichaClinicaGeneralDialog,
  FichaClinicaGeneralDialogResultado,
} from './dialogs/ficha-clinica-general-dialog';
import { UsuariosService } from '../../service/usuarios.service';
import { ConfirmacionService } from '../../shared/confirmacion/confirmacion.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { AtencionCita, CitaRequest } from '../../models/cita.model';
import { PacienteListado, PacienteAlergia, PacienteAntecedente } from '../../models/paciente.model';
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
import {
  construirHtmlOrdenes,
  construirHtmlEnfermeria,
  construirHtmlEvolucion,
  construirHtmlControlMedicamentos,
  construirHtmlControlSignos,
  construirHtmlCostoPaciente,
} from '../../hospitalizacion/hospitalizacion-impresiones';
import {
  nombreCompletoPaciente,
  edadPaciente,
  construirHtmlFichaConsultaExternaAdulto,
  construirHtmlFichaClinicaGeneral,
  construirHtmlOrdenesMedicasConsulta,
  construirHtmlEvolucionConsulta,
  construirHtmlEnfermeriaConsulta,
  construirHtmlControlSignosConsulta,
  construirHtmlCostoPacienteConsulta,
} from './consulta-impresiones';
import { FacturasService, FacturaCompleta } from '../../service/facturas.service';
import { PermisosMenuService } from '../../service/permisos-menu.service';
import { OperacionDialog, OperacionDialogResultado } from '../../shared/operacion-dialog/operacion-dialog';
import { esConsultaDeLaboratorio } from '../../shared/tipo-consulta.util';

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
  imports: [DatePipe, RouterLink, MatDialogModule, MatMenuModule, MatButtonModule, MatIconModule, MatTooltipModule],
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
  private fichaConsultaExternaAdultoService = inject(FichaConsultaExternaAdultoService);
  private vacunaAplicadaService = inject(VacunaAplicadaService);
  private ordenMedicaConsultaService = inject(OrdenMedicaConsultaService);
  private notaEvolucionConsultaService = inject(NotaEvolucionConsultaService);
  private notaEnfermeriaConsultaService = inject(NotaEnfermeriaConsultaService);
  private controlSignosConsultaService = inject(ControlSignosConsultaService);
  private costoPacienteConsultaService = inject(CostoPacienteConsultaService);
  private fichaClinicaGeneralService = inject(FichaClinicaGeneralService);
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

  // Consulta "Laboratorios" (ver consulta-formulario.ts): el paciente solo
  // viene a hacerse exámenes, sin médico asignado — por eso aquí solo tiene
  // sentido dejar habilitados Exámenes, Constancia médica y Acta de cierre;
  // el resto de paneles (datos clínicos, recetario, hospitalización,
  // marcar para operación) asumen que hay un médico atendiendo.
  esSoloLaboratorio = computed(() => esConsultaDeLaboratorio(this.cita()?.notas ?? null));

  // Navbar de secciones (reemplaza el acordeón largo): solo se muestra el
  // contenido de la sección seleccionada. 'datos' no existe en una consulta
  // de solo laboratorio — el effect de abajo cae a 'examen' en ese caso.
  seccionActiva = signal<string>('datos');

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

  // Alergias y antecedentes del paciente (ya estructurados en su
  // expediente — ver paciente-formulario): se cargan aparte al resolver la
  // cita, solo para armar la impresión de la ficha clínica (ver
  // imprimirFichaConsultaExternaAdulto), no bloquean el resto de la pantalla.
  private alergiasPaciente = signal<PacienteAlergia[]>([]);
  private antecedentesPaciente = signal<PacienteAntecedente[]>([]);
  private tiposAntecedenteApi = this.catalogosService.obtener('TIPO_ANTECEDENTE');
  private tiposAlergiaApi = this.catalogosService.obtener('TIPO_ALERGIA');
  private severidadApi = this.catalogosService.obtener('SEVERIDAD');

  // ==================== Vacunas aplicadas en esta consulta ====================
  // No es historial reutilizable del paciente (como alergias/antecedentes):
  // cada consulta tiene su propio registro de qué se inyectó ahí mismo.
  private tiposVacunaApi = this.catalogosService.obtener('TIPO_VACUNA');
  tiposVacuna = computed(() => this.tiposVacunaApi().map((v) => ({ id: v.id, label: v.nombre })));
  vacunasAplicadas = signal<VacunaAplicada[]>([]);

  // ==================== Órdenes médicas de esta consulta ====================
  // Ligadas a la cita (NO a una hospitalización): sirven para dejar
  // indicaciones a cualquier paciente, no solo a los ingresados. Puede
  // haber varias por consulta, igual que las vacunas. Reutiliza el
  // catálogo TIPO_ORDEN_HOSPITALIZACION (MEDICA/ENFERMERIA).
  private tiposOrdenApi = this.catalogosService.obtener('TIPO_ORDEN_HOSPITALIZACION');
  tiposOrdenMedica = computed(() => this.tiposOrdenApi().map((t) => ({ id: t.id, label: t.nombre })));
  ordenesMedicasConsulta = signal<OrdenMedicaConsulta[]>([]);

  // ==================== Hoja de evolución de esta consulta ====================
  // Misma idea que la de Hospitalización, pero ligada a la cita — para
  // poder dejar seguimiento aunque el paciente no esté ingresado.
  notasEvolucionConsulta = signal<NotaEvolucionConsulta[]>([]);

  // ==================== Enfermería (hoja "ENFERMERIA") de esta consulta ====================
  notasEnfermeriaConsulta = signal<NotaEnfermeriaConsulta[]>([]);

  // ==================== Control de signos de esta consulta ====================
  controlesSignosConsulta = signal<ControlSignosConsulta[]>([]);

  // ==================== Costo paciente de esta consulta ====================
  costosPacienteConsulta = signal<CostoPacienteConsulta[]>([]);

  private pacienteActual = computed(() => this.pacientes().find((x) => x.idPaciente === this.cita()?.idPaciente) ?? null);
  nombrePaciente = computed(() => {
    const p = this.pacienteActual();
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

  // ==================== Ficha clínica (consulta externa adulto) ====================
  // Digitalización del formulario de papel "Ficha Clínica Consulta Externa
  // Adulto" del Sanatorio Medicentro — 1:1 con la cita, igual patrón que la
  // constancia médica.
  fichaConsultaExternaAdulto = signal<FichaConsultaExternaAdulto | null>(null);

  // ==================== Ficha clínica general ====================
  // Digitalización del formulario de papel "Ficha Clínica" del Sanatorio
  // Medicentro Barberena — DISTINTA de la ficha de consulta externa adulto
  // (otros campos: gineco-obstétricos, prenatales, examen por aparatos).
  fichaClinicaGeneral = signal<FichaClinicaGeneral | null>(null);

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

    // 'datos' (la sección por defecto) no existe en una consulta de solo
    // laboratorio — si se detecta esa vez que carga la cita, se cae a
    // 'examen' en vez de dejar la pantalla sin ninguna sección visible.
    effect(() => {
      if (this.esSoloLaboratorio() && this.seccionActiva() === 'datos') {
        this.seccionActiva.set('examen');
      }
    });

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
      fichaConsultaExternaAdulto: this.fichaConsultaExternaAdultoService.RetornarPorCita(this.idCita),
      fichaClinicaGeneral: this.fichaClinicaGeneralService.RetornarPorCita(this.idCita),
      vacunasAplicadas: this.vacunaAplicadaService.RetornarPorCita(this.idCita),
      ordenesMedicasConsulta: this.ordenMedicaConsultaService.RetornarPorCita(this.idCita),
      notasEvolucionConsulta: this.notaEvolucionConsultaService.RetornarPorCita(this.idCita),
      notasEnfermeriaConsulta: this.notaEnfermeriaConsultaService.RetornarPorCita(this.idCita),
      controlesSignosConsulta: this.controlSignosConsultaService.RetornarPorCita(this.idCita),
      costosPacienteConsulta: this.costoPacienteConsultaService.RetornarPorCita(this.idCita),
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
        this.fichaConsultaExternaAdulto.set(r.fichaConsultaExternaAdulto);
        this.fichaClinicaGeneral.set(r.fichaClinicaGeneral);
        this.vacunasAplicadas.set(r.vacunasAplicadas);
        this.ordenesMedicasConsulta.set(r.ordenesMedicasConsulta);
        this.notasEvolucionConsulta.set(r.notasEvolucionConsulta);
        this.notasEnfermeriaConsulta.set(r.notasEnfermeriaConsulta);
        this.controlesSignosConsulta.set(r.controlesSignosConsulta);
        this.costosPacienteConsulta.set(r.costosPacienteConsulta);
        this.cargando.set(false);

        // Aparte y sin bloquear la pantalla: solo hace falta para imprimir
        // la ficha clínica.
        const idPaciente = r.atencion.datos?.cita.cita.idPaciente;
        if (idPaciente) {
          this.pacienteService.RetornarPaciente(idPaciente).subscribe({
            next: (resp) => {
              this.alergiasPaciente.set((resp.datos?.alergias ?? []).filter((a) => a.activo));
              this.antecedentesPaciente.set((resp.datos?.antecedentes ?? []).filter((a) => a.activo));
            },
            error: () => {},
          });
        }
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

    this.abrirVentanaImpresion(html);
  }

  // Compartido por recetas/constancia/acta: abre una ventana nueva con el
  // HTML ya armado y lanza el diálogo de impresión del navegador. No se
  // guarda ningún archivo — se regenera al vuelo cada vez que se imprime.
  private abrirVentanaImpresion(html: string): void {
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

  // ==================== Vacunas aplicadas ====================
  tipoVacunaLabel(idTipoVacuna: number): string {
    return this.tiposVacuna().find((t) => t.id === idTipoVacuna)?.label ?? `#${idTipoVacuna}`;
  }

  abrirDialogoVacuna(): void {
    this.dialog
      .open(VacunaDialog, {
        autoFocus: false,
        data: { tiposVacuna: this.tiposVacuna() },
      })
      .afterClosed()
      .subscribe((resultado: VacunaDialogResultado | null) => {
        if (resultado) this.agregarVacuna(resultado);
      });
  }

  private agregarVacuna(v: VacunaDialogResultado): void {
    const cita = this.cita();
    if (!cita) return;

    const request = {
      idCita: cita.idCita,
      idPaciente: cita.idPaciente,
      idTipoVacuna: v.idTipoVacuna,
      dosis: v.dosis,
      fechaAplicacion: ahoraIsoLocal(),
      observaciones: v.observaciones,
    };

    this.vacunaAplicadaService.crear(request).subscribe({
      next: (nueva) => {
        this.notif.exito('Vacuna registrada');
        this.vacunasAplicadas.update((lista) => [nueva, ...lista]);
      },
      error: (err: Error) => this.notif.error('No se pudo registrar la vacuna: ' + err.message),
    });
  }

  async eliminarVacuna(v: VacunaAplicada): Promise<void> {
    if (!(await this.confirmacion.confirmar(`¿Quitar el registro de la vacuna "${this.tipoVacunaLabel(v.idTipoVacuna)}"?`))) {
      return;
    }
    this.vacunaAplicadaService.eliminar(v.idVacunaAplicada).subscribe({
      next: () => {
        this.notif.exito('Vacuna eliminada');
        this.vacunasAplicadas.update((lista) => lista.filter((x) => x.idVacunaAplicada !== v.idVacunaAplicada));
      },
      error: (err: Error) => this.notif.error('No se pudo eliminar la vacuna: ' + err.message),
    });
  }

  // ==================== Órdenes médicas de esta consulta ====================
  abrirDialogoOrdenMedicaConsulta(): void {
    this.dialog
      .open(OrdenMedicaConsultaDialog, {
        autoFocus: false,
        data: { tiposOrden: this.tiposOrdenMedica() },
      })
      .afterClosed()
      .subscribe((resultado: OrdenMedicaConsultaDialogResultado | null) => {
        if (resultado) this.agregarOrdenMedicaConsulta(resultado);
      });
  }

  tipoOrdenLabel(idTipoOrden: number): string {
    return this.tiposOrdenMedica().find((t) => t.id === idTipoOrden)?.label ?? '—';
  }

  private agregarOrdenMedicaConsulta(v: OrdenMedicaConsultaDialogResultado): void {
    const cita = this.cita();
    if (!cita) return;

    const request = {
      idCita: cita.idCita,
      idPaciente: cita.idPaciente,
      idMedico: cita.idMedico,
      idTipoOrden: v.idTipoOrden,
      fechaOrden: ahoraIsoLocal(),
      indicaciones: v.indicaciones,
    };

    this.ordenMedicaConsultaService.crear(request).subscribe({
      next: (nueva) => {
        this.notif.exito('Orden médica registrada');
        this.ordenesMedicasConsulta.update((lista) => [nueva, ...lista]);
      },
      error: (err: Error) => this.notif.error('No se pudo registrar la orden: ' + err.message),
    });
  }

  async eliminarOrdenMedicaConsulta(o: OrdenMedicaConsulta): Promise<void> {
    if (!(await this.confirmacion.confirmar('¿Quitar esta orden médica?'))) {
      return;
    }
    this.ordenMedicaConsultaService.eliminar(o.idOrdenMedicaConsulta).subscribe({
      next: () => {
        this.notif.exito('Orden médica eliminada');
        this.ordenesMedicasConsulta.update((lista) => lista.filter((x) => x.idOrdenMedicaConsulta !== o.idOrdenMedicaConsulta));
      },
      error: (err: Error) => this.notif.error('No se pudo eliminar la orden: ' + err.message),
    });
  }

  // Reproduce el papel físico "ÓRDENES MÉDICAS" del Sanatorio Medicentro:
  // logo, nombre del paciente y una tabla Fecha/Hora/Médico — Indicaciones.
  imprimirOrdenesMedicasConsulta(): void {
    const paciente = this.pacienteActual();
    if (!paciente) return;

    const html = construirHtmlOrdenesMedicasConsulta(
      this.ordenesMedicasConsulta(),
      nombreCompletoPaciente(paciente),
      (id) => this.tipoOrdenLabel(id),
      () => this.nombreMedico(),
    );
    this.abrirVentanaImpresion(html);
  }

  // ==================== Hoja de evolución de esta consulta ====================
  abrirDialogoNotaEvolucionConsulta(): void {
    this.dialog
      .open(NotaEvolucionConsultaDialog, { autoFocus: false, data: {} })
      .afterClosed()
      .subscribe((resultado: NotaEvolucionConsultaDialogResultado | null) => {
        if (resultado) this.agregarNotaEvolucionConsulta(resultado);
      });
  }

  private agregarNotaEvolucionConsulta(v: NotaEvolucionConsultaDialogResultado): void {
    const cita = this.cita();
    if (!cita) return;

    const request = {
      idCita: cita.idCita,
      idPaciente: cita.idPaciente,
      idMedico: cita.idMedico,
      fechaHora: ahoraIsoLocal(),
      evolucion: v.evolucion,
    };

    this.notaEvolucionConsultaService.crear(request).subscribe({
      next: (nueva) => {
        this.notif.exito('Nota de evolución registrada');
        this.notasEvolucionConsulta.update((lista) => [nueva, ...lista]);
      },
      error: (err: Error) => this.notif.error('No se pudo registrar la nota: ' + err.message),
    });
  }

  async eliminarNotaEvolucionConsulta(n: NotaEvolucionConsulta): Promise<void> {
    if (!(await this.confirmacion.confirmar('¿Quitar esta nota de evolución?'))) {
      return;
    }
    this.notaEvolucionConsultaService.eliminar(n.idNotaEvolucionConsulta).subscribe({
      next: () => {
        this.notif.exito('Nota de evolución eliminada');
        this.notasEvolucionConsulta.update((lista) => lista.filter((x) => x.idNotaEvolucionConsulta !== n.idNotaEvolucionConsulta));
      },
      error: (err: Error) => this.notif.error('No se pudo eliminar la nota: ' + err.message),
    });
  }

  // Reproduce el papel físico "HOJA DE EVOLUCIÓN" del Sanatorio Medicentro:
  // logo, nombre del paciente y una tabla Fecha | Evolución.
  imprimirNotasEvolucionConsulta(): void {
    const paciente = this.pacienteActual();
    const cita = this.cita();
    if (!paciente || !cita) return;

    const fechaConsulta = new Date(cita.fechaHoraInicio).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const html = construirHtmlEvolucionConsulta(
      this.notasEvolucionConsulta(),
      nombreCompletoPaciente(paciente),
      () => this.nombreMedico(),
      fechaConsulta,
    );
    this.abrirVentanaImpresion(html);
  }

  // ==================== Enfermería (hoja "ENFERMERIA") de esta consulta ====================
  abrirDialogoNotaEnfermeriaConsulta(): void {
    this.dialog
      .open(NotaEnfermeriaConsultaDialog, { autoFocus: false, data: {} })
      .afterClosed()
      .subscribe((resultado: NotaEnfermeriaConsultaDialogResultado | null) => {
        if (resultado) this.agregarNotaEnfermeriaConsulta(resultado);
      });
  }

  private agregarNotaEnfermeriaConsulta(v: NotaEnfermeriaConsultaDialogResultado): void {
    const cita = this.cita();
    if (!cita) return;

    const request = {
      idCita: cita.idCita,
      idPaciente: cita.idPaciente,
      idEmpleado: cita.idMedico,
      fechaHora: ahoraIsoLocal(),
      nota: v.nota,
    };

    this.notaEnfermeriaConsultaService.crear(request).subscribe({
      next: (nueva) => {
        this.notif.exito('Nota de enfermería registrada');
        this.notasEnfermeriaConsulta.update((lista) => [nueva, ...lista]);
      },
      error: (err: Error) => this.notif.error('No se pudo registrar la nota: ' + err.message),
    });
  }

  async eliminarNotaEnfermeriaConsulta(n: NotaEnfermeriaConsulta): Promise<void> {
    if (!(await this.confirmacion.confirmar('¿Quitar esta nota de enfermería?'))) {
      return;
    }
    this.notaEnfermeriaConsultaService.eliminar(n.idNotaEnfermeriaConsulta).subscribe({
      next: () => {
        this.notif.exito('Nota de enfermería eliminada');
        this.notasEnfermeriaConsulta.update((lista) => lista.filter((x) => x.idNotaEnfermeriaConsulta !== n.idNotaEnfermeriaConsulta));
      },
      error: (err: Error) => this.notif.error('No se pudo eliminar la nota: ' + err.message),
    });
  }

  // Reproduce el papel físico "ENFERMERIA" del Sanatorio Medicentro: logo,
  // nombre del paciente y una tabla Fecha | Evolución.
  imprimirNotasEnfermeriaConsulta(): void {
    const paciente = this.pacienteActual();
    const cita = this.cita();
    if (!paciente || !cita) return;

    const fechaConsulta = new Date(cita.fechaHoraInicio).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const html = construirHtmlEnfermeriaConsulta(
      this.notasEnfermeriaConsulta(),
      nombreCompletoPaciente(paciente),
      () => this.nombreMedico(),
      fechaConsulta,
    );
    this.abrirVentanaImpresion(html);
  }

  // ==================== Control de signos de esta consulta ====================
  abrirDialogoControlSignosConsulta(): void {
    this.dialog
      .open(ControlSignosConsultaDialog, { autoFocus: false, data: {} })
      .afterClosed()
      .subscribe((resultado: ControlSignosConsultaDialogResultado | null) => {
        if (resultado) this.agregarControlSignosConsulta(resultado);
      });
  }

  private agregarControlSignosConsulta(v: ControlSignosConsultaDialogResultado): void {
    const cita = this.cita();
    if (!cita) return;

    const request = {
      idCita: cita.idCita,
      idPaciente: cita.idPaciente,
      fechaHora: ahoraIsoLocal(),
      presionArterial: v.presionArterial,
      temperatura: v.temperatura,
      frecuenciaRespiratoria: v.frecuenciaRespiratoria,
      observaciones: v.observaciones,
    };

    this.controlSignosConsultaService.crear(request).subscribe({
      next: (nuevo) => {
        this.notif.exito('Control de signos registrado');
        this.controlesSignosConsulta.update((lista) => [nuevo, ...lista]);
      },
      error: (err: Error) => this.notif.error('No se pudo registrar el control: ' + err.message),
    });
  }

  async eliminarControlSignosConsulta(c: ControlSignosConsulta): Promise<void> {
    if (!(await this.confirmacion.confirmar('¿Quitar este control de signos?'))) {
      return;
    }
    this.controlSignosConsultaService.eliminar(c.idControlSignosConsulta).subscribe({
      next: () => {
        this.notif.exito('Control de signos eliminado');
        this.controlesSignosConsulta.update((lista) => lista.filter((x) => x.idControlSignosConsulta !== c.idControlSignosConsulta));
      },
      error: (err: Error) => this.notif.error('No se pudo eliminar el control: ' + err.message),
    });
  }

  // Reproduce el papel físico "CONTROL DE SIGNOS" del Sanatorio Medicentro:
  // logo, datos generales y una tabla Fecha/Hora/P.A./Temperatura/F.R./Observaciones.
  imprimirControlSignosConsulta(): void {
    const paciente = this.pacienteActual();
    if (!paciente) return;

    const html = construirHtmlControlSignosConsulta(
      this.controlesSignosConsulta(),
      nombreCompletoPaciente(paciente),
      edadPaciente(paciente.fechaNacimiento),
    );
    this.abrirVentanaImpresion(html);
  }

  // ==================== Costo paciente de esta consulta ====================
  abrirDialogoCostoPacienteConsulta(): void {
    this.dialog
      .open(CostoPacienteConsultaDialog, { autoFocus: false, data: { medicamentos: this.medicamentos() } })
      .afterClosed()
      .subscribe((resultado: CostoPacienteConsultaDialogResultado | null) => {
        if (resultado) this.agregarCostoPacienteConsulta(resultado);
      });
  }

  private agregarCostoPacienteConsulta(v: CostoPacienteConsultaDialogResultado): void {
    const cita = this.cita();
    if (!cita) return;

    const request = {
      idCita: cita.idCita,
      idPaciente: cita.idPaciente,
      idMedicamento: v.idMedicamento,
      fecha: ahoraIsoLocal().slice(0, 10) + 'T00:00:00',
      descripcion: v.descripcion,
      cantidad: v.cantidad,
      valorUnitario: v.valorUnitario,
    };

    this.costoPacienteConsultaService.crear(request).subscribe({
      next: (nuevo) => {
        this.notif.exito('Costo registrado');
        this.costosPacienteConsulta.update((lista) => [nuevo, ...lista]);
      },
      error: (err: Error) => this.notif.error('No se pudo registrar el costo: ' + err.message),
    });
  }

  async eliminarCostoPacienteConsulta(c: CostoPacienteConsulta): Promise<void> {
    if (!(await this.confirmacion.confirmar(`¿Quitar "${c.descripcion}" de los costos de esta consulta?`))) {
      return;
    }
    this.costoPacienteConsultaService.eliminar(c.idCostoPacienteConsulta).subscribe({
      next: () => {
        this.notif.exito('Costo eliminado');
        this.costosPacienteConsulta.update((lista) => lista.filter((x) => x.idCostoPacienteConsulta !== c.idCostoPacienteConsulta));
      },
      error: (err: Error) => this.notif.error('No se pudo eliminar el costo: ' + err.message),
    });
  }

  totalCostosPacienteConsulta(costos: CostoPacienteConsulta[]): number {
    return costos.reduce((acc, c) => acc + c.cantidad * c.valorUnitario, 0);
  }

  // Reproduce el papel físico "COSTO PACIENTE" del Sanatorio Medicentro:
  // logo, datos generales y una tabla Fecha/Medicamentos/Cantidad/Valor, con
  // el total al final.
  imprimirCostoPacienteConsulta(): void {
    const paciente = this.pacienteActual();
    if (!paciente) return;

    const html = construirHtmlCostoPacienteConsulta(
      this.costosPacienteConsulta(),
      nombreCompletoPaciente(paciente),
      edadPaciente(paciente.fechaNacimiento),
    );
    this.abrirVentanaImpresion(html);
  }

  // ==================== Ficha clínica (consulta externa adulto) ====================
  abrirDialogoFichaConsultaExternaAdulto(): void {
    const existente = this.fichaConsultaExternaAdulto();
    this.dialog
      .open(FichaConsultaExternaAdultoDialog, {
        autoFocus: false,
        data: { valorInicial: existente },
      })
      .afterClosed()
      .subscribe((resultado: FichaConsultaExternaAdultoDialogResultado | null) => {
        if (resultado) this.guardarFichaConsultaExternaAdulto(resultado);
      });
  }

  private guardarFichaConsultaExternaAdulto(v: FichaConsultaExternaAdultoDialogResultado): void {
    const cita = this.cita();
    if (!cita) return;

    const request = {
      idCita: cita.idCita,
      idPaciente: cita.idPaciente,
      idMedico: cita.idMedico,
      ...v,
    };

    const existente = this.fichaConsultaExternaAdulto();
    const peticion = existente
      ? this.fichaConsultaExternaAdultoService.actualizar(existente.idFicha, request)
      : this.fichaConsultaExternaAdultoService.crear(request);

    peticion.subscribe({
      next: (nueva) => {
        this.notif.exito('Ficha clínica guardada');
        this.fichaConsultaExternaAdulto.set(nueva);
      },
      error: (err: Error) => this.notif.error('No se pudo guardar la ficha clínica: ' + err.message),
    });
  }

  private edadPaciente(fechaNacimiento: string): number {
    const [y, m, d] = fechaNacimiento.slice(0, 10).split('-').map(Number);
    const nacimiento = new Date(y, m - 1, d);
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const aunNoCumple =
      hoy.getMonth() < nacimiento.getMonth() || (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
    if (aunNoCumple) edad--;
    return edad;
  }

  // Antecedentes del paciente que coincidan con ese código (FAMILIAR/
  // PERSONAL/QUIRURGICO de TIPO_ANTECEDENTE), unidos en una sola línea —
  // "MED" del papel corresponde al tipo "Personal" del expediente.
  private antecedentesPorTipo(codigo: string): string | null {
    const idTipo = this.tiposAntecedenteApi().find((t) => t.codigo === codigo)?.id;
    if (idTipo === undefined) return null;
    const descripciones = this.antecedentesPaciente()
      .filter((a) => a.idTipoAntecedente === idTipo)
      .map((a) => a.descripcion);
    return descripciones.length ? descripciones.join('; ') : null;
  }

  // Alergias del paciente, cada una como "descripción (tipo, severidad)".
  private alergiasPacienteTexto(): string | null {
    const tipos = this.tiposAlergiaApi();
    const severidades = this.severidadApi();
    const lista = this.alergiasPaciente().map((a) => {
      const tipo = tipos.find((t) => t.id === a.idTipoAlergia)?.nombre ?? '';
      const severidad = severidades.find((s) => s.id === a.idSeveridad)?.nombre ?? '';
      const detalle = [tipo, severidad].filter(Boolean).join(', ');
      return detalle ? `${a.descripcion} (${detalle})` : a.descripcion;
    });
    return lista.length ? lista.join('; ') : null;
  }

  // Vacunas registradas en ESTA consulta (ver panel "Vacunas aplicadas"),
  // cada una como "nombre (dosis)".
  private vacunasAplicadasTexto(): string | null {
    const lista = this.vacunasAplicadas().map((v) => {
      const nombre = this.tipoVacunaLabel(v.idTipoVacuna);
      return v.dosis ? `${nombre} (${v.dosis})` : nombre;
    });
    return lista.length ? lista.join('; ') : null;
  }

  imprimirFichaConsultaExternaAdulto(): void {
    const f = this.fichaConsultaExternaAdulto();
    const paciente = this.pacienteActual();
    const cita = this.cita();
    if (!f || !paciente || !cita) return;

    const fechaConsulta = new Date(cita.fechaHoraInicio).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const html = construirHtmlFichaConsultaExternaAdulto(
      f,
      paciente,
      fechaConsulta,
      this.nombreMedico(),
      {
        familiar: this.antecedentesPorTipo('FAMILIAR'),
        personal: this.antecedentesPorTipo('PERSONAL'),
        quirurgico: this.antecedentesPorTipo('QUIRURGICO'),
        toxico: this.antecedentesPorTipo('TOXICO'),
      },
      this.alergiasPacienteTexto(),
      this.vacunasAplicadasTexto(),
    );
    this.abrirVentanaImpresion(html);
  }

  // ==================== Ficha clínica general ====================
  abrirDialogoFichaClinicaGeneral(): void {
    const existente = this.fichaClinicaGeneral();
    this.dialog
      .open(FichaClinicaGeneralDialog, {
        autoFocus: false,
        data: { valorInicial: existente },
      })
      .afterClosed()
      .subscribe((resultado: FichaClinicaGeneralDialogResultado | null) => {
        if (resultado) this.guardarFichaClinicaGeneral(resultado);
      });
  }

  private guardarFichaClinicaGeneral(v: FichaClinicaGeneralDialogResultado): void {
    const cita = this.cita();
    if (!cita) return;

    const request = {
      idCita: cita.idCita,
      idPaciente: cita.idPaciente,
      idMedico: cita.idMedico,
      ...v,
    };

    const existente = this.fichaClinicaGeneral();
    const peticion = existente
      ? this.fichaClinicaGeneralService.actualizar(existente.idFicha, request)
      : this.fichaClinicaGeneralService.crear(request);

    peticion.subscribe({
      next: (nueva) => {
        this.notif.exito('Ficha clínica general guardada');
        this.fichaClinicaGeneral.set(nueva);
      },
      error: (err: Error) => this.notif.error('No se pudo guardar la ficha clínica general: ' + err.message),
    });
  }

  imprimirFichaClinicaGeneral(): void {
    const f = this.fichaClinicaGeneral();
    const paciente = this.pacienteActual();
    const cita = this.cita();
    if (!f || !paciente || !cita) return;

    const fechaConsulta = new Date(cita.fechaHoraInicio).toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const estadoCivil = paciente.idEstadoCivil
      ? this.catalogosService.obtener('ESTADO_CIVIL')().find((e) => e.id === paciente.idEstadoCivil)?.nombre ?? null
      : null;

    const html = construirHtmlFichaClinicaGeneral(
      f,
      paciente,
      fechaConsulta,
      this.nombreMedico(),
      estadoCivil,
      {
        familiar: this.antecedentesPorTipo('FAMILIAR'),
        personal: this.antecedentesPorTipo('PERSONAL'),
        quirurgico: this.antecedentesPorTipo('QUIRURGICO'),
        toxico: this.antecedentesPorTipo('TOXICO'),
      },
      this.alergiasPacienteTexto(),
    );
    this.abrirVentanaImpresion(html);
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

  // Formato tomado del certificado médico de ejemplo que compartió el
  // usuario (encabezado, "A QUIEN INTERESE", párrafo y firma al pie) —
  // mismo esqueleto para constancia y acta, solo cambia el título y el
  // cuerpo del párrafo.
  private htmlDocumentoClinico(titulo: string, cuerpo: string): string {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const fecha = new Date().toLocaleDateString('es-GT', { day: '2-digit', month: 'long', year: 'numeric' });
    return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>${esc(titulo)}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; padding: 48px 56px; }
  .encabezado { text-align: center; margin-bottom: 28px; }
  .encabezado h1 { font-size: 16px; letter-spacing: 0.04em; margin: 0; text-transform: uppercase; }
  .encabezado p { color: #666; font-size: 12px; margin: 4px 0 0; }
  .fecha { margin: 24px 0; font-size: 13px; }
  .destinatario { font-weight: 700; font-size: 13px; margin: 24px 0 14px; }
  .cuerpo { font-size: 13.5px; line-height: 1.6; text-align: justify; white-space: pre-line; }
  .firma { margin-top: 90px; text-align: center; }
  .firma-linea { border-top: 1px solid #1a1a1a; width: 280px; margin: 0 auto 6px; }
  .firma p { margin: 0; font-size: 13px; }
  .firma .cargo { color: #555; font-size: 12px; }
</style>
</head>
<body>
  <div class="encabezado">
    <h1>${esc(titulo)}</h1>
    <p>Sanatorio Medicentro</p>
  </div>
  <p class="fecha">Guatemala, ${esc(fecha)}</p>
  <p class="destinatario">A QUIEN INTERESE:</p>
  <p class="cuerpo">${esc(cuerpo)}</p>
  <div class="firma">
    <div class="firma-linea"></div>
    <p>${esc(this.nombreMedico())}</p>
    <p class="cargo">Médico</p>
  </div>
</body>
</html>`;
  }

  imprimirConstancia(): void {
    const con = this.constancia();
    if (!con) return;
    const paciente = this.nombrePaciente();
    const diagnostico = con.diagnostico?.trim() ? ` con diagnóstico de ${con.diagnostico.trim()}` : '';
    const cuerpo = `Este Certificado médico acredita que ${paciente} fue atendido(a) en este centro asistencial${diagnostico}.\n\n${con.contenido}`;
    this.abrirVentanaImpresion(this.htmlDocumentoClinico('Constancia médica', cuerpo));
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

  imprimirActa(): void {
    const a = this.acta();
    if (!a) return;
    const paciente = this.nombrePaciente();
    const horaActa = new Date(a.fechaHora).toLocaleString('es-GT', { dateStyle: 'medium', timeStyle: 'short' });
    const observaciones = a.observaciones?.trim() ? `\n\nObservaciones: ${a.observaciones.trim()}` : '';
    const cuerpo = `Esta Acta de cierre acredita que ${paciente} fue atendido(a) en este centro asistencial el ${horaActa} por el motivo de consulta: ${a.motivoIngreso}.${observaciones}`;
    this.abrirVentanaImpresion(this.htmlDocumentoClinico('Acta de cierre de consulta', cuerpo));
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

  // ==================== Impresos de Hospitalización (menú "Imprimir") ====================
  // hospitalizacionIniciada() solo trae el registro base de la
  // hospitalización (para el resumen en pantalla); estos documentos
  // necesitan el detalle completo (órdenes, notas, etc.), así que se piden
  // aparte al momento de imprimir — sin salir de esta pantalla.
  medicoLabel = (idMedico: number | null): string => {
    if (idMedico == null) return '—';
    return this.medicos().find((m) => m.idEmpleado === idMedico)?.nombreCompleto ?? '—';
  };

  medicamentoLabel = (idMedicamento: number): string => {
    return this.medicamentos().find((m) => m.idMedicamento === idMedicamento)?.nombre ?? '—';
  };

  private formatFechaHospitalizacion(o: unknown): string {
    const valor = (o as any)?.fechaOrden ?? (o as any)?.fecha_orden ?? o;
    if (!valor) return '—';
    const fecha = new Date(valor as string);
    if (isNaN(fecha.getTime())) return '—';
    return fecha.toLocaleString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  private formatHoraHospitalizacion(hora: string): string {
    return hora ? hora.slice(0, 5) : '—';
  }

  private conHospitalizacionCompleta(accion: (reg: import('../../service/hospitalizaciones.service').HospitalizacionCompleta) => void): void {
    const h = this.hospitalizacionIniciada();
    if (!h) return;
    this.hospitalizacionesService.obtenerDesdeApi(h.hospitalizacion.idHospitalizacion).subscribe({
      next: (reg) => accion(reg),
      error: (err: HttpErrorResponse) => this.notif.error('No se pudo cargar la hospitalización: ' + (err.error?.mensaje ?? err.message)),
    });
  }

  imprimirOrdenesHospitalizacion(): void {
    this.conHospitalizacionCompleta((reg) => {
      const html = construirHtmlOrdenes(
        reg,
        this.nombrePaciente(),
        this.medicoLabel,
        (id) => (id == null ? '—' : this.tipoOrdenLabel(id)),
        (o) => this.formatFechaHospitalizacion(o),
      );
      this.abrirVentanaImpresion(html);
    });
  }

  imprimirEnfermeriaHospitalizacion(): void {
    this.conHospitalizacionCompleta((reg) => {
      const html = construirHtmlEnfermeria(reg, this.nombrePaciente(), this.medicoLabel);
      this.abrirVentanaImpresion(html);
    });
  }

  imprimirEvolucionHospitalizacion(): void {
    this.conHospitalizacionCompleta((reg) => {
      const html = construirHtmlEvolucion(reg, this.nombrePaciente(), this.medicoLabel);
      this.abrirVentanaImpresion(html);
    });
  }

  imprimirControlMedicamentosHospitalizacion(): void {
    this.conHospitalizacionCompleta((reg) => {
      const html = construirHtmlControlMedicamentos(reg, this.nombrePaciente(), this.medicamentoLabel, (hora) => this.formatHoraHospitalizacion(hora));
      this.abrirVentanaImpresion(html);
    });
  }

  imprimirControlSignosHospitalizacion(): void {
    this.conHospitalizacionCompleta((reg) => {
      const paciente = this.pacienteActual();
      const edad = paciente ? this.edadPaciente(paciente.fechaNacimiento) : null;
      const html = construirHtmlControlSignos(reg, this.nombrePaciente(), edad);
      this.abrirVentanaImpresion(html);
    });
  }

  imprimirCostoPacienteHospitalizacion(): void {
    this.conHospitalizacionCompleta((reg) => {
      const paciente = this.pacienteActual();
      const edad = paciente ? this.edadPaciente(paciente.fechaNacimiento) : null;
      const html = construirHtmlCostoPaciente(reg, this.nombrePaciente(), edad);
      this.abrirVentanaImpresion(html);
    });
  }

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
