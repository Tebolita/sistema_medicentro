import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { provideNativeDateAdapter } from '@angular/material/core';
import { forkJoin } from 'rxjs';

import { PacienteService } from '../../service/paciente.service';
import { CatalogoService } from '../../service/catalogo.service';
import {
  PacienteCompleto,
  CrearPacienteRequest,
  EditarPacienteRequest,
} from '../../models/paciente.model';
import { CatalogoOpcion, CODIGOS_CATALOGO } from '../../models/catalogo.model';

// Forma que espera el HTML en cada <mat-option>: { id, label }.
interface OpcionCatalogo {
  id: number;
  label: string;
}

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
    ReactiveFormsModule,
    RouterLink,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
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
  private platformId = inject(PLATFORM_ID);

  // ==================== CATÁLOGOS (desde /api/catalogos) ====================
  // Se guardan crudos (con su `codigo`) y se exponen al HTML como { id, label }
  // con los mismos nombres que antes, para no tener que cambiar el HTML.
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

  // Ids temporales negativos para filas nuevas de contactos/alergias/antecedentes.
  // El backend los interpreta como "insertar" (ver EditarPacienteRequest).
  private ultimoIdTemporal = 0;
  private generarIdTemporal(): number {
    this.ultimoIdTemporal -= 1;
    return this.ultimoIdTemporal;
  }

  datosGenerales = this.fb.nonNullable.group({
    codigoExpediente: [{ value: '', disabled: true }],
    primerNombre: ['', Validators.required],
    segundoNombre: [''],
    primerApellido: ['', Validators.required],
    segundoApellido: [''],
    fechaNacimiento: this.fb.control<Date | null>(null, Validators.required),
    idGenero: this.fb.control<number | null>(null),
    idTipoDocumento: this.fb.control<number | null>(null),
    numeroDocumento: [''],
    idEstadoCivil: this.fb.control<number | null>(null),
    idTipoSangre: this.fb.control<number | null>(null),
    idNivelConfidencialidad: this.fb.control<number | null>(null),
    idEstadoPaciente: this.fb.control<number | null>(null, Validators.required),
  });

  contacto = this.fb.nonNullable.group({
    telefonoPrincipal: [''],
    telefonoSecundario: [''],
    correo: ['', Validators.email],
    direccion: [''],
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

    // En el servidor (SSR) no hay sesión ni token: solo se consulta la API
    // desde el navegador.
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.cargarCatalogos();

    if (esEdicion) {
      this.pacienteService.RetornarPaciente(Number(idParam)).subscribe({
        next: (resp) => {
          if (resp.datos) {
            this.cargar(resp.datos);
          }
        },
        error: (err: Error) => alert('No se pudo cargar el paciente: ' + err.message),
      });
    }
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
      error: (err: Error) => alert('No se pudieron cargar los catálogos: ' + err.message),
    });
  }

  private crearContactoGroup(c?: PacienteCompleto['contactos'][number]) {
    return this.fb.nonNullable.group({
      id: c?.idContactoEmergencia ?? this.generarIdTemporal(),
      nombreCompleto: [c?.nombreCompleto ?? '', Validators.required],
      idParentesco: this.fb.control<number | null>(c?.idParentesco ?? null),
      telefono: [c?.telefono ?? '', Validators.required],
      direccion: [c?.direccion ?? ''],
    });
  }

  private crearAlergiaGroup(a?: PacienteCompleto['alergias'][number]) {
    return this.fb.nonNullable.group({
      id: a?.idAlergia ?? this.generarIdTemporal(),
      idTipoAlergia: this.fb.control<number | null>(a?.idTipoAlergia ?? null, Validators.required),
      descripcion: [a?.descripcion ?? '', Validators.required],
      idSeveridad: this.fb.control<number | null>(a?.idSeveridad ?? null, Validators.required),
      fechaDiagnostico: this.fb.control<Date | null>(
        a?.fechaDiagnostico ? parseIsoDateLocal(a.fechaDiagnostico) : null,
      ),
    });
  }

  private crearAntecedenteGroup(a?: PacienteCompleto['antecedentes'][number]) {
    return this.fb.nonNullable.group({
      id: a?.idAntecedente ?? this.generarIdTemporal(),
      idTipoAntecedente: this.fb.control<number | null>(a?.idTipoAntecedente ?? null, Validators.required),
      descripcion: [a?.descripcion ?? '', Validators.required],
      fechaRegistro: this.fb.control<Date | null>(
        a?.fechaRegistro ? parseIsoDateLocal(a.fechaRegistro) : new Date(),
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

  guardar(): void {
    if (this.guardando()) {
      return;
    }

    this.datosGenerales.markAllAsTouched();
    this.contacto.markAllAsTouched();
    this.contactosEmergencia.markAllAsTouched();
    this.alergias.markAllAsTouched();
    this.antecedentes.markAllAsTouched();

    if (
      this.datosGenerales.invalid ||
      this.contacto.invalid ||
      this.contactosEmergencia.invalid ||
      this.alergias.invalid ||
      this.antecedentes.invalid
    ) {
      return;
    }

    const dg = this.datosGenerales.getRawValue();
    const ct = this.contacto.getRawValue();

    // Campos de la ficha (iguales para crear y editar).
    const datos = {
      primerNombre: dg.primerNombre,
      segundoNombre: dg.segundoNombre || null,
      primerApellido: dg.primerApellido,
      segundoApellido: dg.segundoApellido || null,
      fechaNacimiento: toIsoDate(dg.fechaNacimiento)!,
      idGenero: dg.idGenero,
      idTipoDocumento: dg.idTipoDocumento,
      numeroDocumento: dg.numeroDocumento || null,
      idEstadoCivil: dg.idEstadoCivil,
      telefonoPrincipal: ct.telefonoPrincipal || null,
      telefonoSecundario: ct.telefonoSecundario || null,
      correo: ct.correo || null,
      direccion: ct.direccion || null,
      idTipoSangre: dg.idTipoSangre,
      idNivelConfidencialidad: dg.idNivelConfidencialidad,
      idEstadoPaciente: dg.idEstadoPaciente!,
    };

    const contactos = this.contactosEmergencia.getRawValue().map((c) => ({
      idContactoEmergencia: c.id,
      nombreCompleto: c.nombreCompleto,
      idParentesco: c.idParentesco,
      telefono: c.telefono,
      direccion: c.direccion || null,
    }));
    const alergias = this.alergias.getRawValue().map((a) => ({
      idAlergia: a.id,
      idTipoAlergia: a.idTipoAlergia!,
      descripcion: a.descripcion,
      idSeveridad: a.idSeveridad!,
      fechaDiagnostico: toIsoDate(a.fechaDiagnostico),
    }));
    const antecedentes = this.antecedentes.getRawValue().map((a) => ({
      idAntecedente: a.id,
      idTipoAntecedente: a.idTipoAntecedente!,
      descripcion: a.descripcion,
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
          alert(`Paciente creado con expediente ${nuevo.codigoExpediente}`);
          this.router.navigate(['/home/pacientes', nuevo.idPaciente]);
        },
        error: (err: Error) => {
          this.guardando.set(false);
          alert('No se pudo crear el paciente: ' + err.message);
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
          alert('Paciente actualizado correctamente');
        },
        error: (err: Error) => {
          this.guardando.set(false);
          alert('No se pudo actualizar el paciente: ' + err.message);
        },
      });
    }
  }
}