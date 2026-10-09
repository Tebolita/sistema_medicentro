import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Convenio, ConvenioInput, ConveniosService } from '../../service/convenios.service';
import { AseguradorasService } from '../../service/aseguradoras.service';
import { CatalogosService } from '../../service/catalogos.service';

@Component({
  selector: 'app-convenio-formulario',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './convenio-formulario.html',
  styleUrl: './convenio-formulario.css',
})
export class ConvenioFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private conveniosService = inject(ConveniosService);
  private aseguradorasService = inject(AseguradorasService);

  aseguradoras = this.aseguradorasService.listar;

  // ESTADO_CONVENIO: se sembró junto con el resto de catálogos
  // (scripts/sembrar_catalogos.sql). Si no existe todavía, se cae a una
  // lista de ejemplo para no bloquear el formulario.
  private catalogos = inject(CatalogosService);
  private estadosApi = this.catalogos.obtener('ESTADO_CONVENIO');
  estados = computed(() => {
    const api = this.estadosApi();
    return api.length
      ? api.map((v) => ({ id: v.id, label: v.nombre }))
      : [
          { id: 1, label: 'Vigente' },
          { id: 2, label: 'Vencido' },
          { id: 3, label: 'Suspendido' },
        ];
  });

  idConvenio = signal(0);
  esNuevo = computed(() => this.idConvenio() === 0);
  guardando = signal(false);
  errorMsg = signal('');

  form = this.fb.nonNullable.group({
    idAseguradora: this.fb.control<number | null>(null, Validators.required),
    nombreConvenio: ['', Validators.required],
    fechaInicio: ['', Validators.required], // input type="date" (yyyy-MM-dd)
    fechaFin: [''],
    porcentajeCoberturaGeneral: this.fb.control<number | null>(null, [Validators.min(0), Validators.max(100)]),
    idEstadoConvenio: this.fb.control<number | null>(null, Validators.required),
    condiciones: [''],
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      // Edición: se trae del backend (sirve también al recargar la página).
      this.conveniosService.obtenerPorId(Number(idParam)).subscribe({
        next: (c) => this.cargar(c),
        error: (err: Error) => this.errorMsg.set(err.message),
      });
    }
  }

  private cargar(c: Convenio): void {
    this.idConvenio.set(c.idConvenio);
    this.form.patchValue({
      idAseguradora: c.idAseguradora,
      nombreConvenio: c.nombreConvenio,
      fechaInicio: c.fechaInicio?.slice(0, 10) ?? '',
      fechaFin: c.fechaFin?.slice(0, 10) ?? '',
      porcentajeCoberturaGeneral: c.porcentajeCoberturaGeneral,
      idEstadoConvenio: c.idEstadoConvenio,
      condiciones: c.condiciones ?? '',
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const input: ConvenioInput = {
      idAseguradora: v.idAseguradora!,
      nombreConvenio: v.nombreConvenio.trim(),
      fechaInicio: v.fechaInicio,
      fechaFin: v.fechaFin || null,
      porcentajeCoberturaGeneral: v.porcentajeCoberturaGeneral,
      idEstadoConvenio: v.idEstadoConvenio!,
      condiciones: v.condiciones.trim() || null,
    };

    this.guardando.set(true);
    this.errorMsg.set('');
    const peticion = this.esNuevo()
      ? this.conveniosService.crear(input)
      : this.conveniosService.actualizar(this.idConvenio(), input);
    peticion.subscribe({
      next: () => this.router.navigate(['/home/mantenimiento/convenios']),
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
      },
    });
  }
}
