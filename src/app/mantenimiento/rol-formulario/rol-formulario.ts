import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Rol, RolPermiso, RolesService } from '../../service/roles.service';
import { PermisosService } from '../../service/permisos.service';

@Component({
  selector: 'app-rol-formulario',
  imports: [ReactiveFormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatCheckboxModule, MatButtonModule, MatIconModule],
  templateUrl: './rol-formulario.html',
  styleUrl: './rol-formulario.css',
})
export class RolFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private rolesService = inject(RolesService);
  private permisosService = inject(PermisosService);

  permisos = this.permisosService.listar;

  idRol = signal(0);
  esNuevo = computed(() => this.idRol() === 0);
  guardando = signal(false);
  errorMsg = signal('');

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    descripcion: [''],
  });

  // --- Permisos asignados (solo en edición) ---
  permisosAsignados = signal<RolPermiso[]>([]);
  idsAsignados = computed(() => new Set(this.permisosAsignados().map((p) => p.idPermiso)));
  cargandoPermisos = signal(false);
  errorPermisos = signal('');

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      // Edición: se trae del backend (sirve también al recargar la página).
      this.rolesService.obtenerPorId(Number(idParam)).subscribe({
        next: (r) => this.cargar(r),
        error: (err: Error) => this.errorMsg.set(err.message),
      });
    }

    afterNextRender(() => this.permisosService.cargar());
  }

  private cargar(r: Rol): void {
    this.idRol.set(r.idRol);
    this.form.patchValue({ nombre: r.nombre, descripcion: r.descripcion ?? '' });
    this.cargarPermisos();
  }

  private cargarPermisos(): void {
    this.cargandoPermisos.set(true);
    this.errorPermisos.set('');
    this.rolesService.listarPermisos(this.idRol()).subscribe({
      next: (permisos) => {
        this.permisosAsignados.set(permisos);
        this.cargandoPermisos.set(false);
      },
      error: (err: Error) => {
        this.errorPermisos.set(err.message);
        this.cargandoPermisos.set(false);
      },
    });
  }

  alternarPermiso(idPermiso: number, marcado: boolean): void {
    this.errorPermisos.set('');
    const peticion = marcado
      ? this.rolesService.asignarPermiso(this.idRol(), idPermiso)
      : this.rolesService.quitarPermiso(this.idRol(), idPermiso);
    peticion.subscribe({
      next: () => this.cargarPermisos(),
      error: (err: Error) => this.errorPermisos.set(err.message),
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    this.guardando.set(true);
    this.errorMsg.set('');
    const input = { nombre: v.nombre.trim(), descripcion: v.descripcion.trim() || null };
    const peticion = this.esNuevo() ? this.rolesService.crear(input) : this.rolesService.actualizar(this.idRol(), input);
    peticion.subscribe({
      next: () => this.router.navigate(['/home/mantenimiento/roles']),
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
      },
    });
  }
}
