import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TipoExamen, TipoExamenInput, TiposExamenService } from '../../service/tipos-examen.service';
import { CatalogosService } from '../../service/catalogos.service';
import { CATEGORIAS_EXAMEN } from '../../laboratorio/laboratorio-catalogos';
import { AuditoriaInfo } from '../../shared/auditoria-info/auditoria-info';

@Component({
  selector: 'app-tipo-examen-formulario',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    AuditoriaInfo,
  ],
  templateUrl: './tipo-examen-formulario.html',
  styleUrl: './tipo-examen-formulario.css',
})
export class TipoExamenFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private tiposService = inject(TiposExamenService);

  private catalogos = inject(CatalogosService);
  private categoriasApi = this.catalogos.obtener('CATEGORIA_EXAMEN');
  categorias = computed(() => {
    const api = this.categoriasApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : CATEGORIAS_EXAMEN;
  });

  idTipoExamen = signal(0);
  esNuevo = computed(() => this.idTipoExamen() === 0);
  guardando = signal(false);
  errorMsg = signal('');
  registro = signal<TipoExamen | null>(null);

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    idCategoriaExamen: this.fb.control<number | null>(null, Validators.required),
    descripcion: [''],
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      // Edición: se trae del backend (sirve también al recargar la página).
      this.tiposService.obtenerPorId(Number(idParam)).subscribe({
        next: (t) => this.cargar(t),
        error: (err: Error) => this.errorMsg.set(err.message),
      });
    }
  }

  private cargar(t: TipoExamen): void {
    this.idTipoExamen.set(t.idTipoExamen);
    this.registro.set(t);
    this.form.patchValue({
      nombre: t.nombre,
      idCategoriaExamen: t.idCategoriaExamen,
      descripcion: t.descripcion ?? '',
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const input: TipoExamenInput = {
      nombre: v.nombre.trim(),
      idCategoriaExamen: v.idCategoriaExamen!,
      descripcion: v.descripcion.trim() || null,
    };

    this.guardando.set(true);
    this.errorMsg.set('');
    const peticion = this.esNuevo()
      ? this.tiposService.crear(input)
      : this.tiposService.actualizar(this.idTipoExamen(), input);
    peticion.subscribe({
      next: () => this.router.navigate(['/home/mantenimiento/tipos-examen']),
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
      },
    });
  }
}
