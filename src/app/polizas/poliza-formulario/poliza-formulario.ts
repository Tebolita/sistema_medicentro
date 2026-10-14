import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { provideNativeDateAdapter } from '@angular/material/core';
import { forkJoin } from 'rxjs';

import { PolizaService } from '../../service/poliza.service';
import { AseguradoraService } from '../../service/aseguradora.service';
import { PacienteService } from '../../service/paciente.service';
import { CatalogoService } from '../../service/catalogo.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';
import { AuditoriaInfo } from '../../shared/auditoria-info/auditoria-info';
import { LARGOS, limpiarTextos, mensajeError, rangoFechas, requeridoSinEspacios } from '../../shared/validadores';
import { PolizaSeguro, PolizaRequest } from '../../models/seguro.model';
import { PacienteListado } from '../../models/paciente.model';
import { CatalogoOpcion, CODIGOS_CATALOGO } from '../../models/catalogo.model';

// Forma que espera el HTML en cada <mat-option>.
interface OpcionCatalogo {
  id: number;
  label: string;
}
interface OpcionAseguradora {
  id: number;
  nombre: string;
}

// Largos de las columnas de polizas_seguro que no están en LARGOS.
const LARGO_CERTIFICADO = 50;
const LARGO_AUTORIZACION = 50;
// monto_copago es numeric(12,2): máximo 9,999,999,999.99.
const MONTO_MAXIMO = 9999999999.99;

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

function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// El copago es por porcentaje O por monto fijo, no ambos (la lista solo
// puede mostrar uno). El error se marca en el campo del monto.
function unSoloCopago(grupo: AbstractControl): ValidationErrors | null {
  const porcentaje = grupo.get('porcentajeCopago');
  const monto = grupo.get('montoCopago');
  if (!porcentaje || !monto) {
    return null;
  }
  const errores = { ...(monto.errors ?? {}) };
  delete errores['copagoDoble'];
  const doble = porcentaje.value != null && monto.value != null;
  if (doble) {
    errores['copagoDoble'] = true;
  }
  monto.setErrors(Object.keys(errores).length ? errores : null);
  return doble ? { copagoDoble: true } : null;
}

@Component({
  selector: 'app-poliza-formulario',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
    AuditoriaInfo,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './poliza-formulario.html',
  styleUrl: './poliza-formulario.css',
})
export class PolizaFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private polizaService = inject(PolizaService);
  private aseguradoraService = inject(AseguradoraService);
  private pacienteService = inject(PacienteService);
  private catalogoService = inject(CatalogoService);
  private notificaciones = inject(NotificacionesService);
  private platformId = inject(PLATFORM_ID);

  // Largos máximos para los maxlength del HTML.
  readonly largos = {
    poliza: LARGOS.NUMERO_POLIZA,
    certificado: LARGO_CERTIFICADO,
    titular: LARGOS.NOMBRE_COMPLETO,
    autorizacion: LARGO_AUTORIZACION,
    observaciones: LARGOS.DESCRIPCION_CORTA,
  };

  // ==================== DATOS PARA LOS DROPDOWNS (desde la API) ====================
  private pacientesActivos = signal<PacienteListado[]>([]);
  private pacientesEliminados = signal<PacienteListado[]>([]);
  private aseguradorasApi = signal<OpcionAseguradora[]>([]);
  private catalogos = signal<Record<string, CatalogoOpcion[]>>({});

  // Pólizas existentes (activas y eliminadas) para avisar de un duplicado.
  private polizasRegistradas: PolizaSeguro[] = [];

  // Póliza cargada (en edición): también sirve para mostrar quién la creó y modificó.
  registro = signal<PolizaSeguro | null>(null);

  // Para una póliza nueva solo se ofrecen pacientes activos. Al editar, si el
  // paciente de la póliza fue dado de baja, se agrega para que se vea su nombre.
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
  private idPorCodigo(catalogo: string, codigo: string): number | null {
    return this.catalogos()[catalogo]?.find((c) => c.codigo === codigo)?.id ?? null;
  }

  get aseguradoras() { return this.aseguradorasApi(); }
  get ramos() { return this.opciones(CODIGOS_CATALOGO.RAMO_SEGURO); }
  get titularidades() { return this.opciones(CODIGOS_CATALOGO.TITULARIDAD_POLIZA); }
  get estadosPoliza() { return this.opciones(CODIGOS_CATALOGO.ESTADO_POLIZA); }

  idPoliza = signal(0);
  esNueva = computed(() => this.idPoliza() === 0);
  guardando = signal(false);

  // Datos de la póliza que el formulario no edita, para no perderlos al guardar.
  private idConvenio: number | null = null;
  private nombrePropietario: string | null = null;

  form = this.fb.nonNullable.group(
    {
      idPaciente: this.fb.control<number | null>(null, Validators.required),
      idAseguradora: this.fb.control<number | null>(null, Validators.required),
      idRamo: this.fb.control<number | null>(null, Validators.required),
      numeroPoliza: ['', [requeridoSinEspacios, Validators.maxLength(LARGOS.NUMERO_POLIZA)]],
      numeroCertificado: ['', Validators.maxLength(LARGO_CERTIFICADO)],
      idTitularidad: this.fb.control<number | null>(null, Validators.required),
      nombreTitular: ['', Validators.maxLength(LARGOS.NOMBRE_COMPLETO)],
      codigoAutorizacion: ['', Validators.maxLength(LARGO_AUTORIZACION)],
      porcentajeCopago: this.fb.control<number | null>(null, [Validators.min(0), Validators.max(100)]),
      montoCopago: this.fb.control<number | null>(null, [Validators.min(0), Validators.max(MONTO_MAXIMO)]),
      fechaInicioVigencia: this.fb.control<Date | null>(null),
      fechaFinVigencia: this.fb.control<Date | null>(null),
      idEstadoPoliza: this.fb.control<number | null>(null, Validators.required),
      observaciones: ['', Validators.maxLength(LARGOS.DESCRIPCION_CORTA)],
    },
    { validators: [rangoFechas('fechaInicioVigencia', 'fechaFinVigencia'), unSoloCopago] },
  );

  constructor() {
    // Si la póliza es de un dependiente, el nombre del titular es obligatorio.
    this.form.controls.idTitularidad.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.actualizarReglaTitular());

    // En el servidor (SSR) no hay sesión ni token.
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.cargarListas();

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nueva') {
      this.polizaService.RetornarPoliza(Number(idParam)).subscribe({
        next: (resp) => {
          if (resp.datos) {
            this.cargar(resp.datos);
          }
        },
        error: (err: Error) => this.notificaciones.error('No se pudo cargar la póliza: ' + err.message),
      });
    }
  }

  // Mensaje para mostrar en <mat-error> según el error del campo.
  error(control: AbstractControl | null): string {
    if (control?.errors?.['copagoDoble']) {
      return 'Usa porcentaje o monto, no ambos';
    }
    return mensajeError(control);
  }

  private esDependiente(): boolean {
    const id = this.form.controls.idTitularidad.value;
    return id !== null && id === this.idPorCodigo(CODIGOS_CATALOGO.TITULARIDAD_POLIZA, 'DEPENDIENTE');
  }

  private actualizarReglaTitular(): void {
    const control = this.form.controls.nombreTitular;
    const validadores = [Validators.maxLength(LARGOS.NOMBRE_COMPLETO)];
    if (this.esDependiente()) {
      validadores.push(requeridoSinEspacios);
    }
    control.setValidators(validadores);
    control.updateValueAndValidity({ emitEvent: false });
  }

  private cargarListas(): void {
    const c = CODIGOS_CATALOGO;
    forkJoin({
      pacientes: this.pacienteService.RetornarPacientes(),
      pacientesEliminados: this.pacienteService.RetornarPacientesEliminados(),
      aseguradoras: this.aseguradoraService.RetornarAseguradoras(),
      ramos: this.catalogoService.RetornarCatalogo(c.RAMO_SEGURO),
      titularidades: this.catalogoService.RetornarCatalogo(c.TITULARIDAD_POLIZA),
      estados: this.catalogoService.RetornarCatalogo(c.ESTADO_POLIZA),
      polizas: this.polizaService.RetornarPolizas(),
      polizasEliminadas: this.polizaService.RetornarPolizasEliminadas(),
    }).subscribe({
      next: (r) => {
        this.pacientesActivos.set(r.pacientes.datos ?? []);
        this.pacientesEliminados.set(r.pacientesEliminados.datos ?? []);
        this.aseguradorasApi.set((r.aseguradoras.datos ?? []).map((a) => ({ id: a.idAseguradora, nombre: a.nombre })));
        this.catalogos.set({
          [c.RAMO_SEGURO]: r.ramos.datos ?? [],
          [c.TITULARIDAD_POLIZA]: r.titularidades.datos ?? [],
          [c.ESTADO_POLIZA]: r.estados.datos ?? [],
        });
        this.polizasRegistradas = [...(r.polizas.datos ?? []), ...(r.polizasEliminadas.datos ?? [])];

        // Valores por defecto para una póliza nueva, buscados por código.
        if (this.esNueva()) {
          const f = this.form.controls;
          if (f.idTitularidad.value === null) {
            f.idTitularidad.setValue(this.idPorCodigo(c.TITULARIDAD_POLIZA, 'TITULAR'));
          }
          if (f.idEstadoPoliza.value === null) {
            f.idEstadoPoliza.setValue(this.idPorCodigo(c.ESTADO_POLIZA, 'VIGENTE'));
          }
        }
        this.actualizarReglaTitular();
      },
      error: (err: Error) => this.notificaciones.error('No se pudieron cargar las listas del formulario: ' + err.message),
    });
  }

  private cargar(registro: PolizaSeguro): void {
    this.idPoliza.set(registro.idPoliza);
    this.registro.set(registro);
    this.idConvenio = registro.idConvenio;
    this.nombrePropietario = registro.nombrePropietario;
    this.form.patchValue({
      idPaciente: registro.idPaciente,
      idAseguradora: registro.idAseguradora,
      idRamo: registro.idRamo,
      numeroPoliza: registro.numeroPoliza,
      numeroCertificado: registro.numeroCertificado ?? '',
      idTitularidad: registro.idTitularidad,
      nombreTitular: registro.nombreTitular ?? '',
      codigoAutorizacion: registro.codigoAutorizacion ?? '',
      porcentajeCopago: registro.porcentajeCopago,
      montoCopago: registro.montoCopago,
      fechaInicioVigencia: registro.fechaInicioVigencia ? parseIsoDateLocal(registro.fechaInicioVigencia) : null,
      fechaFinVigencia: registro.fechaFinVigencia ? parseIsoDateLocal(registro.fechaFinVigencia) : null,
      idEstadoPoliza: registro.idEstadoPoliza,
      observaciones: registro.observaciones ?? '',
    });
  }

  // La base no permite repetir aseguradora + número de póliza + certificado.
  // Se avisa antes de guardar para no depender del error del servidor.
  private polizaRepetida(): PolizaSeguro | null {
    const v = this.form.getRawValue();
    const poliza = v.numeroPoliza.trim().toLowerCase();
    const certificado = v.numeroCertificado.trim().toLowerCase();
    if (!poliza || !certificado || v.idAseguradora === null) {
      return null;
    }
    return (
      this.polizasRegistradas.find(
        (p) =>
          p.idPoliza !== this.idPoliza() &&
          p.idAseguradora === v.idAseguradora &&
          p.numeroPoliza.trim().toLowerCase() === poliza &&
          (p.numeroCertificado ?? '').trim().toLowerCase() === certificado,
      ) ?? null
    );
  }

  guardar(): void {
    if (this.guardando()) {
      return;
    }
    this.form.markAllAsTouched();

    const repetida = this.polizaRepetida();
    if (repetida) {
      const estado = repetida.activo ? '' : ' (eliminada, se puede reactivar desde la pestaña Eliminadas)';
      this.form.controls.numeroCertificado.setErrors({
        duplicado: `Este certificado ya está registrado con esa aseguradora y póliza${estado}`,
      });
    }

    if (this.form.invalid) {
      this.notificaciones.error('Revisa los campos marcados en rojo.');
      return;
    }

    const v = this.form.getRawValue();
    const textos = limpiarTextos({
      numeroPoliza: v.numeroPoliza,
      numeroCertificado: v.numeroCertificado,
      nombreTitular: v.nombreTitular,
      codigoAutorizacion: v.codigoAutorizacion,
      observaciones: v.observaciones,
    });
    const request: PolizaRequest = {
      idPaciente: v.idPaciente!,
      idAseguradora: v.idAseguradora!,
      idConvenio: this.idConvenio,
      idRamo: v.idRamo!,
      numeroPoliza: textos.numeroPoliza!,
      numeroCertificado: textos.numeroCertificado,
      idTitularidad: v.idTitularidad!,
      nombreTitular: textos.nombreTitular,
      nombrePropietario: this.nombrePropietario,
      codigoAutorizacion: textos.codigoAutorizacion,
      porcentajeCopago: v.porcentajeCopago,
      montoCopago: v.montoCopago,
      fechaInicioVigencia: toIsoDate(v.fechaInicioVigencia),
      fechaFinVigencia: toIsoDate(v.fechaFinVigencia),
      idEstadoPoliza: v.idEstadoPoliza!,
      observaciones: textos.observaciones,
    };

    const esNueva = this.esNueva();
    this.guardando.set(true);
    const peticion = esNueva
      ? this.polizaService.CrearPoliza(request)
      : this.polizaService.ActualizarPoliza(this.idPoliza(), request);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        this.notificaciones.exito(
          esNueva
            ? `Póliza ${request.numeroPoliza} registrada correctamente`
            : `Póliza ${request.numeroPoliza} actualizada correctamente`,
        );
        this.router.navigate(['/home/polizas']);
      },
      error: (err: Error) => {
        this.guardando.set(false);
        this.notificaciones.error('No se pudo guardar la póliza: ' + err.message);
      },
    });
  }
}