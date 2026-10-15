import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser, NgClass } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { provideNativeDateAdapter } from '@angular/material/core';
import { forkJoin } from 'rxjs';

import { BitacoraItem, ExpedienteService } from '../../service/expediente.service';
import { PacienteService } from '../../service/paciente.service';
import { EmpleadoService } from '../../service/empleado.service';
import { EspecialidadService } from '../../service/especialidad.service';
import { CatalogoService } from '../../service/catalogo.service';
import { UsuariosService } from '../../service/usuarios.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { AuditoriaInfo } from '../../shared/auditoria-info/auditoria-info';
import { LARGOS, mensajeError, noFutura } from '../../shared/validadores';
import { HistorialClinico, HistorialClinicoRequest } from '../../models/tratamiento.model';
import { PacienteListado } from '../../models/paciente.model';
import { CatalogoOpcion, CODIGOS_CATALOGO } from '../../models/catalogo.model';

// Formas que espera el HTML en cada <mat-option>.
interface OpcionCatalogo {
  id: number;
  label: string;
}
interface OpcionMedico {
  id: number;
  nombre: string;
  especialidad: string;
}

// Fecha + hora LOCAL como 'YYYY-MM-DDTHH:mm:ss' (sin 'Z', para que el
// backend no la corra por la zona horaria).
function toIsoDateTimeLocal(value: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${value.getFullYear()}-${p(value.getMonth() + 1)}-${p(value.getDate())}T${p(value.getHours())}:${p(value.getMinutes())}:${p(value.getSeconds())}`;
}

function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Largos de historial_clinico: motivo_consulta y diagnostico son nvarchar(500).
const LARGO_MOTIVO = LARGOS.DESCRIPCION_LARGA;
const LARGO_DIAGNOSTICO = LARGOS.DESCRIPCION_LARGA;

// Códigos de TIPO_REGISTRO_CLINICO (los ids reales dependen de cada base).
// El esquema no tiene columnas propias para pediatría/signos vitales/tipo de
// consulta, así que esos datos extra viajan dentro de `notas`, cada uno en su
// propia línea al inicio (ej. "Acompañante: Ana López"), para poder
// separarlos otra vez al editar sin duplicarlos.
const TIPO_PEDIATRICA = 'FICHA_PEDIATRICA';
const TIPO_EXTERNA = 'FICHA_EXTERNA';
const TIPO_SIGNOS_VITALES = 'EVOLUCION';
const PREFIJO_ACOMPANANTE = 'Acompañante: ';
const PREFIJO_TIPO_CONSULTA = 'Tipo de consulta: ';

@Component({
  selector: 'app-expediente-formulario',
  imports: [
    NgClass,
    ReactiveFormsModule,
    RouterLink,
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
  templateUrl: './expediente-formulario.html',
  styleUrl: './expediente-formulario.css',
})
export class ExpedienteFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private expedienteService = inject(ExpedienteService);
  private pacienteService = inject(PacienteService);
  private empleadoService = inject(EmpleadoService);
  private especialidadService = inject(EspecialidadService);
  private catalogoService = inject(CatalogoService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);
  private platformId = inject(PLATFORM_ID);

  // Largos máximos y fecha máxima para el HTML.
  readonly largos = {
    motivo: LARGO_MOTIVO,
    diagnostico: LARGO_DIAGNOSTICO,
    notas: LARGOS.NOTAS,
    acompanante: LARGOS.NOMBRE_COMPLETO,
  };
  readonly hoy = new Date();

  // ==================== DATOS PARA LOS DROPDOWNS (desde la API) ====================
  private pacientesActivos = signal<PacienteListado[]>([]);
  private pacientesEliminados = signal<PacienteListado[]>([]);
  private medicosApi = signal<OpcionMedico[]>([]);
  private catalogos = signal<Record<string, CatalogoOpcion[]>>({});

  // Registro cargado (en edición): también sirve para mostrar quién lo creó y modificó.
  registro = signal<HistorialClinico | null>(null);

  // Para un registro nuevo solo se ofrecen pacientes activos. Al editar, si el
  // paciente fue dado de baja, se agrega para que se vea su nombre.
  pacientes = computed(() => {
    const activos = this.pacientesActivos();
    const idActual = this.registro()?.idPaciente;
    const actualEliminado = this.pacientesEliminados().find((p) => p.idPaciente === idActual);
    return actualEliminado ? [...activos, actualEliminado] : activos;
  });

  esPacienteDadoDeBaja(idPaciente: number): boolean {
    return this.pacientesEliminados().some((p) => p.idPaciente === idPaciente);
  }

  private opciones(codigo: string): OpcionCatalogo[] {
    return (this.catalogos()[codigo] ?? []).map((c) => ({ id: c.id, label: c.nombre }));
  }
  private idPorCodigo(catalogo: string, codigo: string | null): number | null {
    if (!codigo) return null;
    return this.catalogos()[catalogo]?.find((c) => c.codigo === codigo)?.id ?? null;
  }
  private codigoPorId(catalogo: string, id: number | null): string | null {
    return this.catalogos()[catalogo]?.find((c) => c.id === id)?.codigo ?? null;
  }

  get medicos() { return this.medicosApi(); }
  get tiposRegistro() { return this.opciones(CODIGOS_CATALOGO.TIPO_REGISTRO_CLINICO); }
  get nivelesConfidencialidad() { return this.opciones(CODIGOS_CATALOGO.NIVEL_CONFIDENCIALIDAD); }
  get tiposConsulta() { return this.opciones(CODIGOS_CATALOGO.TIPO_CONSULTA); }

  idHistorial = signal(0);
  esNuevo = computed(() => this.idHistorial() === 0);
  guardando = signal(false);

  // ============================================================
  // HISTORIAL DE AUDITORÍA (tabla real: historial_clinico)
  // ============================================================
  historialAbierto = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);
  cargandoHistorial = signal(false);

  // Datos del registro que el formulario no edita, para no perderlos al guardar.
  private idCita: number | null = null;
  private idTratamiento: number | null = null;
  private horaOriginal: Date | null = null;

  // Notas tal como vienen de la base (con acompañante/tipo de consulta al
  // inicio). Se separan cuando ya llegaron el registro y los catálogos.
  private notasPendientes: string | null = null;
  private catalogosCargados = false;

  // Tipo pedido desde el menú (?tipo=FICHA_PEDIATRICA), se aplica cuando llegan los catálogos.
  private codigoTipoPendiente: string | null = null;

  form = this.fb.nonNullable.group({
    idPaciente: this.fb.control<number | null>(null, Validators.required),
    idMedico: this.fb.control<number | null>(null, Validators.required),
    idTipoRegistro: this.fb.control<number | null>(null, Validators.required),
    fecha: this.fb.control<Date | null>(new Date(), [Validators.required, noFutura]),
    idNivelConfidencialidad: this.fb.control<number | null>(null),
    motivoConsulta: ['', Validators.maxLength(LARGO_MOTIVO)],
    diagnostico: ['', Validators.maxLength(LARGO_DIAGNOSTICO)],
    notas: ['', Validators.maxLength(LARGOS.NOTAS)],
    // Campos que solo aplican según el tipo de ficha (pediátrica/externa);
    // se guardan dentro de `notas`, ver comentario junto a TIPO_PEDIATRICA.
    acompanante: ['', Validators.maxLength(LARGOS.NOMBRE_COMPLETO)],
    idTipoConsultaExterna: this.fb.control<number | null>(null),
  });

  // FormControl.value no es una signal: se refleja el tipo seleccionado acá
  // para poder reaccionar (mostrar/ocultar campos) cuando el usuario lo cambia.
  private tipoSeleccionado = signal<number | null>(null);
  private codigoTipoSeleccionado = computed(() =>
    this.codigoPorId(CODIGOS_CATALOGO.TIPO_REGISTRO_CLINICO, this.tipoSeleccionado()),
  );

  esPediatrica = computed(() => this.codigoTipoSeleccionado() === TIPO_PEDIATRICA);
  esExterna = computed(() => this.codigoTipoSeleccionado() === TIPO_EXTERNA);
  mostrarHintSignosVitales = computed(() => this.codigoTipoSeleccionado() === TIPO_SIGNOS_VITALES);

  tituloFicha = computed(() => {
    if (this.esPediatrica()) return 'pediátrica';
    if (this.esExterna()) return 'externa';
    return null;
  });

  constructor() {
    this.form.controls.idTipoRegistro.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((tipo) => this.tipoSeleccionado.set(tipo));

    const idParam = this.route.snapshot.paramMap.get('id');
    const esEdicion = !!idParam && idParam !== 'nuevo';

    // Los queryParams pueden cambiar sin recrear el componente (p.ej. de
    // "Ficha pediátrica" a "Ficha externa" desde el menú), por eso se suscribe.
    if (!esEdicion) {
      this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
        this.codigoTipoPendiente = params.get('tipo');
        this.aplicarTipoPendiente();

        const idPacienteParam = params.get('paciente');
        if (idPacienteParam) {
          this.form.patchValue({ idPaciente: Number(idPacienteParam) });
        }
      });
    }

    // En el servidor (SSR) no hay sesión ni token.
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.cargarListas();

    if (esEdicion) {
      this.expedienteService.RetornarExpediente(Number(idParam)).subscribe({
        next: (resp) => {
          if (resp.datos) {
            this.cargar(resp.datos);
          }
        },
        error: (err: Error) => this.notificaciones.error('No se pudo cargar el registro clínico: ' + err.message),
      });
    }
  }

  // Mensaje para mostrar en <mat-error> según el error del campo.
  error(control: AbstractControl | null): string {
    return mensajeError(control);
  }

  private aplicarTipoPendiente(): void {
    const id = this.idPorCodigo(CODIGOS_CATALOGO.TIPO_REGISTRO_CLINICO, this.codigoTipoPendiente);
    this.form.patchValue({ idTipoRegistro: id });
    this.tipoSeleccionado.set(id);
  }

  private cargarListas(): void {
    const c = CODIGOS_CATALOGO;
    forkJoin({
      pacientes: this.pacienteService.RetornarPacientes(),
      pacientesEliminados: this.pacienteService.RetornarPacientesEliminados(),
      medicos: this.empleadoService.RetornarMedicos(),
      especialidades: this.especialidadService.RetornarEspecialidades(),
      tipos: this.catalogoService.RetornarCatalogo(c.TIPO_REGISTRO_CLINICO),
      niveles: this.catalogoService.RetornarCatalogo(c.NIVEL_CONFIDENCIALIDAD),
      tiposConsulta: this.catalogoService.RetornarCatalogo(c.TIPO_CONSULTA),
    }).subscribe({
      next: (r) => {
        const especialidades = r.especialidades.datos ?? [];
        this.pacientesActivos.set(r.pacientes.datos ?? []);
        this.pacientesEliminados.set(r.pacientesEliminados.datos ?? []);
        this.medicosApi.set(
          (r.medicos.datos ?? []).map((m) => ({
            id: m.idEmpleado,
            nombre: m.nombreCompleto,
            especialidad: especialidades.find((e) => e.idEspecialidad === m.idEspecialidad)?.nombre ?? 'Sin especialidad',
          })),
        );
        this.catalogos.set({
          [c.TIPO_REGISTRO_CLINICO]: r.tipos.datos ?? [],
          [c.NIVEL_CONFIDENCIALIDAD]: r.niveles.datos ?? [],
          [c.TIPO_CONSULTA]: r.tiposConsulta.datos ?? [],
        });
        this.catalogosCargados = true;

        if (this.esNuevo()) {
          this.aplicarTipoPendiente();
          if (this.form.controls.idNivelConfidencialidad.value === null) {
            this.form.controls.idNivelConfidencialidad.setValue(this.idPorCodigo(c.NIVEL_CONFIDENCIALIDAD, 'NORMAL'));
          }
        } else {
          // Refresca la detección de pediátrica/externa ya con los catálogos cargados.
          this.tipoSeleccionado.set(this.form.controls.idTipoRegistro.value);
          this.separarNotas();
        }
      },
      error: (err: Error) => this.notificaciones.error('No se pudieron cargar las listas del formulario: ' + err.message),
    });
  }

  private cargar(registro: HistorialClinico): void {
    this.idHistorial.set(registro.idHistorial);
    this.registro.set(registro);
    this.idCita = registro.idCita;
    this.idTratamiento = registro.idTratamiento;
    this.horaOriginal = new Date(registro.fecha);
    this.form.patchValue({
      idPaciente: registro.idPaciente,
      idMedico: registro.idMedico,
      idTipoRegistro: registro.idTipoRegistro,
      fecha: parseIsoDateLocal(registro.fecha),
      idNivelConfidencialidad: registro.idNivelConfidencialidad,
      motivoConsulta: registro.motivoConsulta ?? '',
      diagnostico: registro.diagnostico ?? '',
      notas: registro.notas ?? '',
    });
    this.tipoSeleccionado.set(registro.idTipoRegistro);
    this.notasPendientes = registro.notas;
    this.separarNotas();
  }

  // Al editar, saca el acompañante y el tipo de consulta del inicio de `notas`
  // y los pone en sus campos, para que al guardar no se dupliquen.
  // Entiende el formato actual (una línea por dato) y el anterior
  // ("Acompañante: Ana. notas..." / "Control. notas...").
  private separarNotas(): void {
    if (this.notasPendientes === null || !this.catalogosCargados) {
      return;
    }
    let resto = this.notasPendientes;
    this.notasPendientes = null;
    let acompanante = '';
    let idTipoConsulta: number | null = null;

    const lineas = resto.split('\n');
    while (lineas.length) {
      const linea = lineas[0];
      if (linea.startsWith(PREFIJO_ACOMPANANTE)) {
        acompanante = linea.slice(PREFIJO_ACOMPANANTE.length).trim();
      } else if (linea.startsWith(PREFIJO_TIPO_CONSULTA)) {
        const label = linea.slice(PREFIJO_TIPO_CONSULTA.length).trim();
        idTipoConsulta = this.tiposConsulta.find((t) => t.label === label)?.id ?? null;
      } else {
        break;
      }
      lineas.shift();
    }
    resto = lineas.join('\n');

    // Formato anterior, todo en una línea.
    const viejoAcompanante = /^Acompañante: (.+?)\.(?: |$)/.exec(resto);
    if (!acompanante && viejoAcompanante) {
      acompanante = viejoAcompanante[1];
      resto = resto.slice(viejoAcompanante[0].length);
    }
    if (idTipoConsulta === null) {
      const viejoTipo = this.tiposConsulta.find((t) => resto === `${t.label}.` || resto.startsWith(`${t.label}. `));
      if (viejoTipo) {
        idTipoConsulta = viejoTipo.id;
        resto = resto.slice(viejoTipo.label.length + 1).trimStart();
      }
    }

    this.form.patchValue({ acompanante, idTipoConsultaExterna: idTipoConsulta, notas: resto });
  }

  guardar(): void {
    if (this.guardando()) {
      return;
    }
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.notificaciones.error('Revisa los campos marcados en rojo.');
      return;
    }

    const v = this.form.getRawValue();
    const motivo = v.motivoConsulta.trim();
    const diagnostico = v.diagnostico.trim();
    const notasTexto = v.notas.trim();
    if (!motivo && !diagnostico && !notasTexto) {
      this.notificaciones.error('Escribe al menos el motivo de consulta, el diagnóstico o las notas.');
      return;
    }

    // El esquema no tiene columnas propias para acompañante/tipo de consulta,
    // así que se guardan al inicio de `notas`, cada uno en su propia línea.
    const prefijos: string[] = [];
    const acompanante = v.acompanante.trim();
    if (this.esPediatrica() && acompanante) {
      prefijos.push(`${PREFIJO_ACOMPANANTE}${acompanante}`);
    }
    if (this.esExterna() && v.idTipoConsultaExterna) {
      const tipoConsultaLabel = this.tiposConsulta.find((t) => t.id === v.idTipoConsultaExterna)?.label;
      if (tipoConsultaLabel) {
        prefijos.push(`${PREFIJO_TIPO_CONSULTA}${tipoConsultaLabel}`);
      }
    }
    const notas = [...prefijos, notasTexto].filter(Boolean).join('\n') || null;

    // La fecha del formulario + la hora (la original al editar, la actual al crear).
    const hora = this.horaOriginal ?? new Date();
    const fecha = new Date(v.fecha!);
    fecha.setHours(hora.getHours(), hora.getMinutes(), hora.getSeconds(), 0);

    const request: HistorialClinicoRequest = {
      idPaciente: v.idPaciente!,
      idMedico: v.idMedico!,
      idCita: this.idCita,
      idTratamiento: this.idTratamiento,
      idTipoRegistro: v.idTipoRegistro!,
      idNivelConfidencialidad: v.idNivelConfidencialidad,
      fecha: toIsoDateTimeLocal(fecha),
      motivoConsulta: motivo || null,
      diagnostico: diagnostico || null,
      notas,
    };

    const esNuevo = this.esNuevo();
    this.guardando.set(true);
    const peticion = esNuevo
      ? this.expedienteService.CrearExpediente(request)
      : this.expedienteService.ActualizarExpediente(this.idHistorial(), request);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.notificaciones.exito(
          esNuevo ? 'Registro clínico creado correctamente' : 'Registro clínico actualizado correctamente',
        );
        this.router.navigate(['/home/expedientes']);
      },
      error: (err: Error) => {
        this.guardando.set(false);
        this.notificaciones.error('No se pudo guardar el registro clínico: ' + err.message);
      },
    });
  }

  // ============================================================
  // HISTORIAL DE AUDITORÍA
  // ============================================================

  abrirHistorial(): void {
    const id = this.idHistorial();
    if (id === 0) return;

    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.expedienteService.RetornarBitacoraPorRegistro('historial_clinico', id).subscribe({
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

      const idRegistroReal = this.idHistorial();

      const cambios: Array<{ campo: string; antes: string; despues: string }> = [];
      const claves = new Set([...Object.keys(antes), ...Object.keys(despues)]);

      for (const k of claves) {
        if (camposIgnorados.has(k)) continue;

        let a = antes[k];
        let d = despues[k];

        if (k === 'IdHistorial' && idRegistroReal != null) {
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
        if (x.campo.toLowerCase().includes('id historial')) return -1;
        if (y.campo.toLowerCase().includes('id historial')) return 1;
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