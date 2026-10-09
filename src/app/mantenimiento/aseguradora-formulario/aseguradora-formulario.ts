import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Aseguradora, AseguradoraInput, AseguradorasService } from '../../service/aseguradoras.service';
import { CatalogosService } from '../../service/catalogos.service';
import { TIPOS_ENTIDAD_ASEGURADORA } from '../aseguradoras-catalogos';

@Component({
  selector: 'app-aseguradora-formulario',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './aseguradora-formulario.html',
  styleUrl: './aseguradora-formulario.css',
})
export class AseguradoraFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private aseguradorasService = inject(AseguradorasService);

  private catalogos = inject(CatalogosService);
  private tiposEntidadApi = this.catalogos.obtener('TIPO_ENTIDAD_ASEGURADORA');
  tiposEntidad = computed(() => {
    const api = this.tiposEntidadApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : TIPOS_ENTIDAD_ASEGURADORA;
  });

  idAseguradora = signal(0);
  esNueva = computed(() => this.idAseguradora() === 0);
  guardando = signal(false);
  errorMsg = signal('');

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    nit: [''],
    idTipoEntidad: this.fb.control<number | null>(null),
    contacto: [''],
    telefono: [''],
    correo: ['', Validators.email],
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nueva') {
      // Edición: se trae del backend (sirve también al recargar la página).
      this.aseguradorasService.obtenerPorId(Number(idParam)).subscribe({
        next: (a) => this.cargar(a),
        error: (err: Error) => this.errorMsg.set(err.message),
      });
    }
  }

  private cargar(a: Aseguradora): void {
    this.idAseguradora.set(a.idAseguradora);
    this.form.patchValue({
      nombre: a.nombre,
      nit: a.nit ?? '',
      idTipoEntidad: a.idTipoEntidad,
      contacto: a.contacto ?? '',
      telefono: a.telefono ?? '',
      correo: a.correo ?? '',
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const input: AseguradoraInput = {
      nombre: v.nombre.trim(),
      nit: v.nit.trim() || null,
      idTipoEntidad: v.idTipoEntidad,
      contacto: v.contacto.trim() || null,
      telefono: v.telefono.trim() || null,
      correo: v.correo.trim() || null,
    };

    this.guardando.set(true);
    this.errorMsg.set('');
    const peticion = this.esNueva()
      ? this.aseguradorasService.crear(input)
      : this.aseguradorasService.actualizar(this.idAseguradora(), input);
    peticion.subscribe({
      next: () => this.router.navigate(['/home/mantenimiento/aseguradoras']),
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
      },
    });
  }
}
