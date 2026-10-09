import { Component, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
  private platformId = inject(PLATFORM_ID);

  // ==================== DATOS PARA LOS DROPDOWNS (desde la API) ====================
  pacientes = signal<PacienteListado[]>([]);
  private aseguradorasApi = signal<OpcionAseguradora[]>([]);
  private catalogos = signal<Record<string, CatalogoOpcion[]>>({});

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

  form = this.fb.nonNullable.group({
    idPaciente: this.fb.control<number | null>(null, Validators.required),
    idAseguradora: this.fb.control<number | null>(null, Validators.required),
    idRamo: this.fb.control<number | null>(null, Validators.required),
    numeroPoliza: ['', Validators.required],
    numeroCertificado: [''],
    idTitularidad: this.fb.control<number | null>(null, Validators.required),
    nombreTitular: [''],
    codigoAutorizacion: [''],
    porcentajeCopago: this.fb.control<number | null>(null),
    montoCopago: this.fb.control<number | null>(null),
    fechaInicioVigencia: this.fb.control<Date | null>(null),
    fechaFinVigencia: this.fb.control<Date | null>(null),
    idEstadoPoliza: this.fb.control<number | null>(null, Validators.required),
    observaciones: [''],
  });

  constructor() {
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
        error: (err: Error) => alert('No se pudo cargar la póliza: ' + err.message),
      });
    }
  }

  private cargarListas(): void {
    const c = CODIGOS_CATALOGO;
    forkJoin({
      pacientes: this.pacienteService.RetornarPacientes(),
      aseguradoras: this.aseguradoraService.RetornarAseguradoras(),
      ramos: this.catalogoService.RetornarCatalogo(c.RAMO_SEGURO),
      titularidades: this.catalogoService.RetornarCatalogo(c.TITULARIDAD_POLIZA),
      estados: this.catalogoService.RetornarCatalogo(c.ESTADO_POLIZA),
    }).subscribe({
      next: (r) => {
        this.pacientes.set(r.pacientes.datos ?? []);
        this.aseguradorasApi.set((r.aseguradoras.datos ?? []).map((a) => ({ id: a.idAseguradora, nombre: a.nombre })));
        this.catalogos.set({
          [c.RAMO_SEGURO]: r.ramos.datos ?? [],
          [c.TITULARIDAD_POLIZA]: r.titularidades.datos ?? [],
          [c.ESTADO_POLIZA]: r.estados.datos ?? [],
        });

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
      },
      error: (err: Error) => alert('No se pudieron cargar las listas del formulario: ' + err.message),
    });
  }

  private cargar(registro: PolizaSeguro): void {
    this.idPoliza.set(registro.idPoliza);
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

  guardar(): void {
    if (this.guardando()) {
      return;
    }
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const v = this.form.getRawValue();
    const request: PolizaRequest = {
      idPaciente: v.idPaciente!,
      idAseguradora: v.idAseguradora!,
      idConvenio: this.idConvenio,
      idRamo: v.idRamo!,
      numeroPoliza: v.numeroPoliza,
      numeroCertificado: v.numeroCertificado || null,
      idTitularidad: v.idTitularidad!,
      nombreTitular: v.nombreTitular || null,
      nombrePropietario: this.nombrePropietario,
      codigoAutorizacion: v.codigoAutorizacion || null,
      porcentajeCopago: v.porcentajeCopago,
      montoCopago: v.montoCopago,
      fechaInicioVigencia: toIsoDate(v.fechaInicioVigencia),
      fechaFinVigencia: toIsoDate(v.fechaFinVigencia),
      idEstadoPoliza: v.idEstadoPoliza!,
      observaciones: v.observaciones || null,
    };

    this.guardando.set(true);
    const peticion = this.esNueva()
      ? this.polizaService.CrearPoliza(request)
      : this.polizaService.ActualizarPoliza(this.idPoliza(), request);

    peticion.subscribe({
      next: () => {
        this.guardando.set(false);
        alert(this.esNueva() ? 'Póliza registrada correctamente' : 'Póliza actualizada correctamente');
        this.router.navigate(['/home/polizas']);
      },
      error: (err: Error) => {
        this.guardando.set(false);
        alert('No se pudo guardar la póliza: ' + err.message);
      },
    });
  }
}