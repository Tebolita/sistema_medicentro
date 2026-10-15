import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser, NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { provideNativeDateAdapter } from '@angular/material/core';
import { forkJoin } from 'rxjs';

import { PacienteService, BitacoraItem } from '../../service/paciente.service';
import { CatalogoService } from '../../service/catalogo.service';
import { UsuariosService } from '../../service/usuarios.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { AuditoriaInfo } from '../../shared/auditoria-info/auditoria-info';
import {
  LARGOS,
  limpiarTextos,
  mensajeError,
  noFutura,
  requeridoSinEspacios,
  soloDigitos,
  telefono,
} from '../../shared/validadores';
import {
  Paciente,
  PacienteCompleto,
  PacienteListado,
  DatosPacienteRequest,
  CrearPacienteRequest,
  EditarPacienteRequest,
} from '../../models/paciente.model';
import { CatalogoOpcion, CODIGOS_CATALOGO } from '../../models/catalogo.model';

// Forma que espera el HTML en cada <mat-option>: { id, label }.
interface OpcionCatalogo {
  id: number;
  label: string;
}

// Código del tipo de documento que exige 13 dígitos.
const TIPO_DOCUMENTO_DPI = 'DPI';
const LARGO_DPI = 13;

function toIsoDate(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// `new Date('YYYY-MM-DD')` parsea la fecha como medianoche UTC (regla del
// estándar ECMA-262 para fechas sin hora), lo que la corre un día hacia
// atrás en cualquier huso horario negativo (ej. Guatemala, UTC-6). Este
// helper construye la fecha en hora LOCAL para que el datepicker la
// muestre igual a como se guardó.
function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

@Component({
  selector: 'app-paciente-formulario',
  imports: [
    NgClass,
    ReactiveFormsModule,
    RouterLink,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    AuditoriaInfo,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './paciente-formulario.html',
  styleUrl: './paciente-formulario.css',
})
export class PacienteFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private pacienteService = inject(PacienteService);
  private catalogoService = inject(CatalogoService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);
  private platformId = inject(PLATFORM_ID);

  // Largos máximos y fecha máxima para el HTML (maxlength y [max] del datepicker).
  readonly largos = LARGOS;
  readonly hoy = new Date();

  // ==================== CATÁLOGOS (desde /api/catalogos) ====================
  // Se guardan crudos (con su `codigo`) y se exponen al HTML como { id, label }.
  private catalogos = signal<Record<string, CatalogoOpcion[]>>({});

  // Se calcula una sola vez cada que llegan los catálogos (no en cada refresco).
  private opcionesPorCodigo = computed(() => {
    const resultado: Record<string, OpcionCatalogo[]> = {};
    for (const [codigo, valores] of Object.entries(this.catalogos())) {
      resultado[codigo] = valores.map((c) => ({ id: c.id, label: c.nombre }));
    }
    return resultado;
  });

  private opciones(codigo: string): OpcionCatalogo[] {
    return this.opcionesPorCodigo()[codigo] ?? [];
  }

  private idPorCodigo(catalogo: string, codigo: string): number | null {
    return this.catalogos()[catalogo]?.find((c) => c.codigo === codigo)?.id ?? null;
  }

  get generos() { return this.opciones(CODIGOS_CATALOGO.GENERO); }
  get tiposDocumento() { return this.opciones(CODIGOS_CATALOGO.TIPO_DOCUMENTO); }
  get estadosCiviles() { return this.opciones(CODIGOS_CATALOGO.ESTADO_CIVIL); }
  get tiposSangre() { return this.opciones(CODIGOS_CATALOGO.TIPO_SANGRE); }
  get nivelesConfidencialidad() { return this.opciones(CODIGOS_CATALOGO.NIVEL_CONFIDENCIALIDAD); }
  get estadosPaciente() { return this.opciones(CODIGOS_CATALOGO.ESTADO_PACIENTE); }
  get parentescos() { return this.opciones(CODIGOS_CATALOGO.PARENTESCO); }
  get tiposAlergia() { return this.opciones(CODIGOS_CATALOGO.TIPO_ALERGIA); }
  get severidades() { return this.opciones(CODIGOS_CATALOGO.SEVERIDAD); }
  get tiposAntecedente() { return this.opciones(CODIGOS_CATALOGO.TIPO_ANTECEDENTE); }

  idPaciente = signal(0);
  esNuevo = computed(() => this.idPaciente() === 0);
  guardando = signal(false);

  // Ficha cargada desde la API: se usa para mostrar quién la creó y modificó.
  registro = signal<Paciente | null>(null);

  // ============================================================
  // Historial de auditoría de este paciente
  // ============================================================
  historialAbierto = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);
  cargandoHistorial = signal(false);

  // Todos los pacientes (activos y eliminados), para avisar antes de guardar
  // si el número de documento ya está registrado.
  private documentosRegistrados: PacienteListado[] = [];

  // Ids temporales negativos para filas nuevas de contactos/alergias/antecedentes.
  // El backend los interpreta como "insertar" (ver EditarPacienteRequest).
  private ultimoIdTemporal = 0;
  private generarIdTemporal(): number {
    this.ultimoIdTemporal -= 1;
    return this.ultimoIdTemporal;
  }

  datosGenerales = this.fb.nonNullable.group({
    codigoExpediente: [{ value: '', disabled: true }],
    primerNombre: ['', [requeridoSinEspacios, Validators.maxLength(LARGOS.NOMBRE)]],
    segundoNombre: ['', Validators.maxLength(LARGOS.NOMBRE)],
    primerApellido: ['', [requeridoSinEspacios, Validators.maxLength(LARGOS.NOMBRE)]],
    segundoApellido: ['', Validators.maxLength(LARGOS.NOMBRE)],
    fechaNacimiento: this.fb.control<Date | null>(null, [Validators.required, noFutura]),
    idGenero: this.fb.control<number | null>(null),
    idTipoDocumento: this.fb.control<number | null>(null),
    numeroDocumento: ['', Validators.maxLength(LARGOS.DOCUMENTO)],
    idEstadoCivil: this.fb.control<number | null>(null),
    idTipoSangre: this.fb.control<number | null>(null),
    idNivelConfidencialidad: this.fb.control<number | null>(null),
    idEstadoPaciente: this.fb.control<number | null>(null, Validators.required),
  });

  contacto = this.fb.nonNullable.group({
    telefonoPrincipal: ['', [telefono, Validators.maxLength(LARGOS.TELEFONO)]],
    telefonoSecundario: ['', [telefono, Validators.maxLength(LARGOS.TELEFONO)]],
    correo: ['', [Validators.email, Validators.maxLength(LARGOS.CORREO)]],
    direccion: ['', Validators.maxLength(LARGOS.DIRECCION)],
  });

  contactosEmergencia = this.fb.array<ReturnType<typeof this.crearContactoGroup>>([]);
  alergias = this.fb.array<ReturnType<typeof this.crearAlergiaGroup>>([]);
  antecedentes = this.fb.array<ReturnType<typeof this.crearAntecedenteGroup>>([]);

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    const esEdicion = !!idParam && idParam !== 'nuevo';

    if (!esEdicion) {
      this.datosGenerales.patchValue({
        codigoExpediente: 'Se genera automáticamente al guardar',
      });
    }

    // Al cambiar el tipo de documento cambian las reglas del número:
    // con tipo elegido el número es obligatorio, y si es DPI deben ser 13 dígitos.
    this.datosGenerales.controls.idTipoDocumento.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.actualizarReglasDocumento());

    // En el servidor (SSR) no hay sesión ni token: solo se consulta la API
    // desde el navegador.
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.cargarCatalogos();
    this.cargarDocumentosRegistrados();

    if (esEdicion) {
      this.pacienteService.RetornarPaciente(Number(idParam)).subscribe({
        next: (resp) => {
          if (resp.datos) {
            this.cargar(resp.datos);
          }
        },
        error: (err: Error) => this.notificaciones.error('No se pudo cargar el paciente: ' + err.message),
      });
    }
  }

  // Mensaje para mostrar en <mat-error> según el error del campo.
  error(control: AbstractControl | null): string {
    return mensajeError(control);
  }

  private actualizarReglasDocumento(): void {
    const dg = this.datosGenerales.controls;
    const idTipo = dg.idTipoDocumento.value;
    const validadores = [Validators.maxLength(LARGOS.DOCUMENTO)];
    if (idTipo !== null) {
      validadores.push(requeridoSinEspacios);
    }
    if (idTipo !== null && idTipo === this.idPorCodigo(CODIGOS_CATALOGO.TIPO_DOCUMENTO, TIPO_DOCUMENTO_DPI)) {
      validadores.push(soloDigitos(LARGO_DPI));
    }
    dg.numeroDocumento.setValidators(validadores);
    dg.numeroDocumento.updateValueAndValidity({ emitEvent: false });
  }

  private cargarCatalogos(): void {
    const c = CODIGOS_CATALOGO;
    const codigos = [
      c.GENERO, c.TIPO_DOCUMENTO, c.ESTADO_CIVIL, c.TIPO_SANGRE, c.NIVEL_CONFIDENCIALIDAD,
      c.ESTADO_PACIENTE, c.PARENTESCO, c.TIPO_ALERGIA, c.SEVERIDAD, c.TIPO_ANTECEDENTE,
    ];
    const peticiones = Object.fromEntries(
      codigos.map((codigo) => [codigo, this.catalogoService.RetornarCatalogo(codigo)]),
    );

    forkJoin(peticiones).subscribe({
      next: (respuestas) => {
        const mapa: Record<string, CatalogoOpcion[]> = {};
        for (const [codigo, resp] of Object.entries(respuestas)) {
          mapa[codigo] = resp.datos ?? [];
        }
        this.catalogos.set(mapa);
        this.actualizarReglasDocumento();

        // Valores por defecto para un paciente nuevo, buscados por código
        // (los ids reales dependen de cada base de datos).
        if (this.esNuevo()) {
          const dg = this.datosGenerales.controls;
          if (dg.idEstadoPaciente.value === null) {
            dg.idEstadoPaciente.setValue(this.idPorCodigo(c.ESTADO_PACIENTE, 'ACTIVO'));
          }
          if (dg.idNivelConfidencialidad.value === null) {
            dg.idNivelConfidencialidad.setValue(this.idPorCodigo(c.NIVEL_CONFIDENCIALIDAD, 'NORMAL'));
          }
        }
      },
      error: (err: Error) => this.notificaciones.error('No se pudieron cargar los catálogos: ' + err.message),
    });
  }

  private cargarDocumentosRegistrados(): void {
    forkJoin({
      activos: this.pacienteService.RetornarPacientes(),
      eliminados: this.pacienteService.RetornarPacientesEliminados(),
    }).subscribe({
      next: (r) => (this.documentosRegistrados = [...(r.activos.datos ?? []), ...(r.eliminados.datos ?? [])]),
      // Si falla, el backend igual rechaza el duplicado; solo se pierde el aviso previo.
      error: () => (this.documentosRegistrados = []),
    });
  }

  // Devuelve el paciente que ya tiene ese mismo documento, si existe.
  private documentoRepetido(idTipo: number | null, numero: string): PacienteListado | null {
    const buscado = numero.trim().toLowerCase();
    if (!buscado) {
      return null;
    }
    return (
      this.documentosRegistrados.find(
        (p) =>
          p.idPaciente !== this.idPaciente() &&
          p.idTipoDocumento === idTipo &&
          (p.numeroDocumento ?? '').trim().toLowerCase() === buscado,
      ) ?? null
    );
  }

  private crearContactoGroup(c?: PacienteCompleto['contactos'][number]) {
    return this.fb.nonNullable.group({
      id: c?.idContactoEmergencia ?? this.generarIdTemporal(),
      nombreCompleto: [c?.nombreCompleto ?? '', [requeridoSinEspacios, Validators.maxLength(LARGOS.NOMBRE_COMPLETO)]],
      idParentesco: this.fb.control<number | null>(c?.idParentesco ?? null),
      telefono: [c?.telefono ?? '', [requeridoSinEspacios, telefono, Validators.maxLength(LARGOS.TELEFONO)]],
      direccion: [c?.direccion ?? '', Validators.maxLength(LARGOS.DIRECCION)],
    });
  }

  private crearAlergiaGroup(a?: PacienteCompleto['alergias'][number]) {
    return this.fb.nonNullable.group({
      id: a?.idAlergia ?? this.generarIdTemporal(),
      idTipoAlergia: this.fb.control<number | null>(a?.idTipoAlergia ?? null, Validators.required),
      descripcion: [a?.descripcion ?? '', [requeridoSinEspacios, Validators.maxLength(LARGOS.DESCRIPCION_CORTA)]],
      idSeveridad: this.fb.control<number | null>(a?.idSeveridad ?? null, Validators.required),
      fechaDiagnostico: this.fb.control<Date | null>(
        a?.fechaDiagnostico ? parseIsoDateLocal(a.fechaDiagnostico) : null,
        noFutura,
      ),
    });
  }

  private crearAntecedenteGroup(a?: PacienteCompleto['antecedentes'][number]) {
    return this.fb.nonNullable.group({
      id: a?.idAntecedente ?? this.generarIdTemporal(),
      idTipoAntecedente: this.fb.control<number | null>(a?.idTipoAntecedente ?? null, Validators.required),
      descripcion: [a?.descripcion ?? '', [requeridoSinEspacios, Validators.maxLength(LARGOS.DESCRIPCION_LARGA)]],
      fechaRegistro: this.fb.control<Date | null>(
        a?.fechaRegistro ? parseIsoDateLocal(a.fechaRegistro) : new Date(),
        [Validators.required, noFutura],
      ),
    });
  }

  agregarContacto(): void {
    this.contactosEmergencia.push(this.crearContactoGroup());
  }

  quitarContacto(index: number): void {
    this.contactosEmergencia.removeAt(index);
  }

  agregarAlergia(): void {
    this.alergias.push(this.crearAlergiaGroup());
  }

  quitarAlergia(index: number): void {
    this.alergias.removeAt(index);
  }

  agregarAntecedente(): void {
    this.antecedentes.push(this.crearAntecedenteGroup());
  }

  quitarAntecedente(index: number): void {
    this.antecedentes.removeAt(index);
  }

  severidadLabel(idSeveridad: number | null): string {
    return this.severidades.find((s) => s.id === idSeveridad)?.label ?? '';
  }

  // Se compara por código (LEVE/MODERADA/SEVERA) porque los ids reales
  // dependen de cada base de datos.
  severidadClase(idSeveridad: number | null): string {
    const codigo = this.catalogos()[CODIGOS_CATALOGO.SEVERIDAD]?.find((s) => s.id === idSeveridad)?.codigo;
    if (codigo === 'SEVERA') return 'severidad-alta';
    if (codigo === 'MODERADA') return 'severidad-media';
    if (codigo === 'LEVE') return 'severidad-baja';
    return '';
  }

  edad(): number | null {
    const fecha = this.datosGenerales.controls.fechaNacimiento.value;
    if (!fecha) {
      return null;
    }
    const hoy = new Date();
    let anios = hoy.getFullYear() - fecha.getFullYear();
    const cumpleEsteAnio = new Date(hoy.getFullYear(), fecha.getMonth(), fecha.getDate());
    if (hoy < cumpleEsteAnio) {
      anios--;
    }
    return anios;
  }

  private cargar(registro: PacienteCompleto): void {
    this.idPaciente.set(registro.paciente.idPaciente);
    this.registro.set(registro.paciente);
    const p = registro.paciente;
    this.datosGenerales.patchValue({
      codigoExpediente: p.codigoExpediente,
      primerNombre: p.primerNombre,
      segundoNombre: p.segundoNombre ?? '',
      primerApellido: p.primerApellido,
      segundoApellido: p.segundoApellido ?? '',
      fechaNacimiento: p.fechaNacimiento ? parseIsoDateLocal(p.fechaNacimiento) : null,
      idGenero: p.idGenero,
      idTipoDocumento: p.idTipoDocumento,
      numeroDocumento: p.numeroDocumento ?? '',
      idEstadoCivil: p.idEstadoCivil,
      idTipoSangre: p.idTipoSangre,
      idNivelConfidencialidad: p.idNivelConfidencialidad,
      idEstadoPaciente: p.idEstadoPaciente,
    });
    this.contacto.patchValue({
      telefonoPrincipal: p.telefonoPrincipal ?? '',
      telefonoSecundario: p.telefonoSecundario ?? '',
      correo: p.correo ?? '',
      direccion: p.direccion ?? '',
    });
    // Se limpian antes de llenar, para poder recargar tras guardar sin duplicar filas.
    this.contactosEmergencia.clear();
    this.alergias.clear();
    this.antecedentes.clear();
    registro.contactos.forEach((c) => this.contactosEmergencia.push(this.crearContactoGroup(c)));
    registro.alergias.forEach((a) => this.alergias.push(this.crearAlergiaGroup(a)));
    registro.antecedentes.forEach((a) => this.antecedentes.push(this.crearAntecedenteGroup(a)));
  }

  // Pestañas que tienen algún campo con error, para decirle al usuario dónde revisar.
  private pestaniasConError(): string[] {
    const pestanias: string[] = [];
    if (this.datosGenerales.invalid) pestanias.push('Datos generales');
    if (this.contacto.invalid) pestanias.push('Contacto');
    if (this.contactosEmergencia.invalid) pestanias.push('Contacto de emergencia');
    if (this.alergias.invalid) pestanias.push('Alergias');
    if (this.antecedentes.invalid) pestanias.push('Antecedentes');
    return pestanias;
  }

  guardar(): void {
    if (this.guardando()) {
      return;
    }

    this.datosGenerales.markAllAsTouched();
    this.contacto.markAllAsTouched();
    this.contactosEmergencia.markAllAsTouched();
    this.alergias.markAllAsTouched();
    this.antecedentes.markAllAsTouched();

    // Aviso de documento repetido antes de mandar nada al backend.
    const dgControles = this.datosGenerales.controls;
    const repetido = this.documentoRepetido(dgControles.idTipoDocumento.value, dgControles.numeroDocumento.value);
    if (repetido) {
      const estado = repetido.activo ? '' : ' (eliminado, se puede reactivar desde la pestaña Eliminados)';
      dgControles.numeroDocumento.setErrors({
        duplicado: `Ya está registrado en el expediente ${repetido.codigoExpediente}${estado}`,
      });
    }

    const conError = this.pestaniasConError();
    if (conError.length) {
      this.notificaciones.error(`Revisa los campos marcados en: ${conError.join(', ')}.`);
      return;
    }

    const dg = this.datosGenerales.getRawValue();
    const ct = this.contacto.getRawValue();

    // Campos de la ficha (iguales para crear y editar), sin espacios sobrantes.
    const datos = {
      ...limpiarTextos({
        primerNombre: dg.primerNombre,
        segundoNombre: dg.segundoNombre,
        primerApellido: dg.primerApellido,
        segundoApellido: dg.segundoApellido,
        numeroDocumento: dg.numeroDocumento,
        telefonoPrincipal: ct.telefonoPrincipal,
        telefonoSecundario: ct.telefonoSecundario,
        correo: ct.correo,
        direccion: ct.direccion,
      }),
      fechaNacimiento: toIsoDate(dg.fechaNacimiento)!,
      idGenero: dg.idGenero,
      idTipoDocumento: dg.idTipoDocumento,
      idEstadoCivil: dg.idEstadoCivil,
      idTipoSangre: dg.idTipoSangre,
      idNivelConfidencialidad: dg.idNivelConfidencialidad,
      idEstadoPaciente: dg.idEstadoPaciente!,
    } as DatosPacienteRequest;

    const contactos = this.contactosEmergencia.getRawValue().map((c) => ({
      idContactoEmergencia: c.id,
      nombreCompleto: c.nombreCompleto.trim(),
      idParentesco: c.idParentesco,
      telefono: c.telefono.trim(),
      direccion: c.direccion.trim() || null,
    }));
    const alergias = this.alergias.getRawValue().map((a) => ({
      idAlergia: a.id,
      idTipoAlergia: a.idTipoAlergia!,
      descripcion: a.descripcion.trim(),
      idSeveridad: a.idSeveridad!,
      fechaDiagnostico: toIsoDate(a.fechaDiagnostico),
    }));
    const antecedentes = this.antecedentes.getRawValue().map((a) => ({
      idAntecedente: a.id,
      idTipoAntecedente: a.idTipoAntecedente!,
      descripcion: a.descripcion.trim(),
      fechaRegistro: toIsoDate(a.fechaRegistro) ?? toIsoDate(new Date())!,
    }));

    this.guardando.set(true);

    if (this.esNuevo()) {
      // POST: al crear no se mandan ids de filas (los genera el backend).
      const request: CrearPacienteRequest = {
        ...datos,
        contactos: contactos.map(({ idContactoEmergencia, ...c }) => c),
        alergias: alergias.map(({ idAlergia, ...a }) => a),
        antecedentes: antecedentes.map(({ idAntecedente, ...a }) => a),
      };
      this.pacienteService.CrearPaciente(request).subscribe({
        next: (resp) => {
          this.guardando.set(false);
          const nuevo = resp.datos!.paciente;
          this.notificaciones.exito(`Paciente creado correctamente con expediente ${nuevo.codigoExpediente}`);
          this.router.navigate(['/home/pacientes', nuevo.idPaciente]);
        },
        error: (err: Error) => {
          this.guardando.set(false);
          this.notificaciones.error('No se pudo crear el paciente: ' + err.message);
        },
      });
    } else {
      // PUT: se mandan SIEMPRE las listas completas; ids negativos = filas nuevas.
      const request: EditarPacienteRequest = { ...datos, contactos, alergias, antecedentes };
      this.pacienteService.ActualizarPaciente(this.idPaciente(), request).subscribe({
        next: (resp) => {
          this.guardando.set(false);
          // Se recarga con lo que devolvió el backend para tener los ids reales
          // de las filas nuevas (así un segundo guardado no las duplica).
          if (resp.datos) {
            this.cargar(resp.datos);
          }
          this.notificaciones.exito('Paciente actualizado correctamente');
        },
        error: (err: Error) => {
          this.guardando.set(false);
          this.notificaciones.error('No se pudo actualizar el paciente: ' + err.message);
        },
      });
    }
  }

  // ============================================================
  // HISTORIAL DE AUDITORÍA
  // ============================================================

  abrirHistorial(): void {
    const id = this.idPaciente();
    if (id === 0) return;

    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.pacienteService.RetornarBitacoraPorRegistro('pacientes', id).subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items);
        this.cargandoHistorial.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error al cargar bitácora:', err.status);
        this.cargandoHistorial.set(false);
        this.notificaciones.error('No se pudo cargar la bitácora');
      },
    });
  }

  cerrarHistorial(): void {
    this.historialAbierto.set(false);
    this.bitacoraSignal.set([]);
  }

  accionLabel(idTipoAccion: number): string {
    if (idTipoAccion === 79) return 'Creó';
    if (idTipoAccion === 80) return 'Modificó';
    if (idTipoAccion === 81) return 'Eliminó';
    return 'Cambió';
  }

  accionClase(idTipoAccion: number): string {
    if (idTipoAccion === 79) return 'accion-crear';
    if (idTipoAccion === 80) return 'accion-modificar';
    if (idTipoAccion === 81) return 'accion-eliminar';
    return 'accion-default';
  }

  accionIcono(idTipoAccion: number): string {
    if (idTipoAccion === 79) return 'add_circle';
    if (idTipoAccion === 80) return 'edit';
    if (idTipoAccion === 81) return 'delete';
    return 'history';
  }

  usuarioLabel(idUsuario: number | null): string {
    if (idUsuario == null) return 'Sistema';
    return this.usuariosService.obtener(idUsuario)?.nombreUsuario ?? `Usuario #${idUsuario}`;
  }

  formatFechaHora(iso: string): string {
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

  camposCambiados(item: BitacoraItem): Array<{ campo: string; antes: string; despues: string }> {
    try {
      const antes = item.valoresAnteriores ? JSON.parse(item.valoresAnteriores) : {};
      const despues = item.valoresNuevos ? JSON.parse(item.valoresNuevos) : {};

      const camposIgnorados = new Set([
        'IdUsuarioModificacion',
        'FechaModificacion',
        'IdUsuarioCreacion',
      ]);

      const idRegistroReal = this.idPaciente();

      const cambios: Array<{ campo: string; antes: string; despues: string }> = [];
      const claves = new Set([...Object.keys(antes), ...Object.keys(despues)]);

      for (const k of claves) {
        if (camposIgnorados.has(k)) continue;

        let a = antes[k];
        let d = despues[k];

        if (k === 'IdPaciente' && idRegistroReal != null) {
          a = idRegistroReal;
          d = idRegistroReal;
        }

        if (JSON.stringify(a) === JSON.stringify(d)) continue;

        cambios.push({
          campo: this.formatearNombreCampo(k),
          antes: this.formatearValor(a, k),
          despues: this.formatearValor(d, k),
        });
      }

      cambios.sort((x, y) => {
        if (x.campo.toLowerCase().includes('id paciente')) return -1;
        if (y.campo.toLowerCase().includes('id paciente')) return 1;
        return x.campo.localeCompare(y.campo);
      });

      return cambios;
    } catch {
      return [];
    }
  }

  private formatearNombreCampo(campo: string): string {
    return campo
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (c) => c.toUpperCase())
      .trim();
  }

  private formatearValor(valor: any, nombreCampo: string = ''): string {
    if (valor === null || valor === undefined) return '—';

    if (this.esCampoFecha(nombreCampo) && typeof valor === 'string') {
      const fecha = new Date(valor);
      if (!isNaN(fecha.getTime())) {
        return fecha.toLocaleString('es-GT', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }

    if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
    if (typeof valor === 'object') return JSON.stringify(valor);
    return String(valor);
  }

  private esCampoFecha(nombreCampo: string): boolean {
    return /fecha|fechahora|creacion|modificacion/i.test(nombreCampo);
  }
}