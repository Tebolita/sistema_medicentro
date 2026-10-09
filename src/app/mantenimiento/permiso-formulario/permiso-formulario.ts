import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Permiso, PermisoInput, PermisosService } from '../../service/permisos.service';
import { CatalogosService } from '../../service/catalogos.service';

@Component({
  selector: 'app-permiso-formulario',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './permiso-formulario.html',
  styleUrl: './permiso-formulario.css',
})
export class PermisoFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private permisosService = inject(PermisosService);

  // A diferencia de otros formularios, acá NO se cae a una lista de ejemplo
  // si el catálogo real todavía no cargó: el id que se guarda es el id real
  // de cat_valor_catalogo, y el backend solo valida que exista ALGÚN valor
  // con ese id (de cualquier tipo) — un id de ejemplo (1, 2, 3...) puede
  // coincidir por accidente con un valor real de OTRO catálogo y guardarse
  // sin error, pero apuntando al módulo equivocado. Mientras no haya datos
  // reales, el select se deshabilita en vez de mostrar opciones falsas.
  private catalogos = inject(CatalogosService);
  private modulosApi = this.catalogos.obtener('MODULO_SISTEMA');
  modulos = computed(() => this.modulosApi().map((v) => ({ id: v.id, label: v.nombre })));
  modulosCargando = computed(() => this.modulosApi().length === 0);

  idPermiso = signal(0);
  esNuevo = computed(() => this.idPermiso() === 0);
  guardando = signal(false);
  errorMsg = signal('');

  form = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.pattern(/^[A-Za-z0-9_.:-]+$/)]],
    nombre: ['', Validators.required],
    idModulo: this.fb.control<number | null>(null, Validators.required),
    descripcion: [''],
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      // Edición: se trae del backend (sirve también al recargar la página).
      this.permisosService.obtenerPorId(Number(idParam)).subscribe({
        next: (p) => this.cargar(p),
        error: (err: Error) => this.errorMsg.set(err.message),
      });
    }
  }

  private cargar(p: Permiso): void {
    this.idPermiso.set(p.idPermiso);
    this.form.patchValue({
      codigo: p.codigo,
      nombre: p.nombre,
      idModulo: p.idModulo,
      descripcion: p.descripcion ?? '',
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const input: PermisoInput = {
      codigo: v.codigo.trim().toUpperCase(),
      nombre: v.nombre.trim(),
      idModulo: v.idModulo!,
      descripcion: v.descripcion.trim() || null,
    };

    this.guardando.set(true);
    this.errorMsg.set('');
    const peticion = this.esNuevo()
      ? this.permisosService.crear(input)
      : this.permisosService.actualizar(this.idPermiso(), input);
    peticion.subscribe({
      next: () => this.router.navigate(['/home/mantenimiento/permisos']),
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
      },
    });
  }
}
