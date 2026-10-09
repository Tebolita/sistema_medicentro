import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Usuario, UsuarioRol, UsuariosService } from '../../service/usuarios.service';
import { EmpleadosService } from '../../service/empleados.service';
import { RolesService } from '../../service/roles.service';
import { CatalogosService } from '../../service/catalogos.service';

const ESTADOS_USUARIO_EJEMPLO = [
  { id: 1, label: 'Activo' },
  { id: 2, label: 'Bloqueado' },
  { id: 3, label: 'Inactivo' },
];

@Component({
  selector: 'app-usuario-formulario',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './usuario-formulario.html',
  styleUrl: './usuario-formulario.css',
})
export class UsuarioFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private usuariosService = inject(UsuariosService);
  private rolesService = inject(RolesService);
  private snackBar = inject(MatSnackBar);

  empleadosService = inject(EmpleadosService);
  empleados = this.empleadosService.listar;
  roles = this.rolesService.listar;

  private catalogos = inject(CatalogosService);
  private estadosApi = this.catalogos.obtener('ESTADO_USUARIO');
  estados = computed(() => {
    const api = this.estadosApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : ESTADOS_USUARIO_EJEMPLO;
  });

  idUsuario = signal(0);
  esNuevo = computed(() => this.idUsuario() === 0);
  guardando = signal(false);
  errorMsg = signal('');

  form = this.fb.nonNullable.group({
    nombreUsuario: ['', Validators.required],
    correo: ['', [Validators.required, Validators.email]],
    // Solo aplica al crear; el backend no deja cambiar la contraseña desde
    // el formulario de edición general (es una acción aparte, "reset").
    contrasena: [''],
    idEmpleado: this.fb.control<number | null>(null),
    idEstadoUsuario: this.fb.control<number | null>(null, Validators.required),
    requiereCambioPassword: [true],
  });

  // --- Roles asignados (solo en edición) ---
  rolesAsignados = signal<UsuarioRol[]>([]);
  cargandoRoles = signal(false);
  errorRoles = signal('');
  rolParaAsignar = signal<number | null>(null);

  rolesDisponibles = computed(() => {
    const asignados = new Set(this.rolesAsignados().map((r) => r.idRol));
    return this.roles().filter((r) => !asignados.has(r.idRol));
  });

  // --- Resetear contraseña (solo en edición; es el admin reseteando la de
  // otro usuario, no el propio usuario cambiando la suya — eso es "Mi
  // cuenta"). El backend no pide ni verifica la contraseña actual. ---
  resetForm = this.fb.nonNullable.group({
    contrasenaNueva: ['', [Validators.required, Validators.minLength(6)]],
    repetirContrasenaNueva: ['', Validators.required],
    requiereCambioPassword: [true],
  });
  guardandoReset = signal(false);
  errorReset = signal('');

  constructor() {
    this.resetForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.validarCoincidenciaReset());

    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      this.form.controls.contrasena.clearValidators();
      // Edición: se trae del backend (sirve también al recargar la página).
      this.usuariosService.obtenerPorId(Number(idParam)).subscribe({
        next: (u) => this.cargar(u),
        error: (err: Error) => this.errorMsg.set(err.message),
      });
    } else {
      this.form.controls.contrasena.setValidators([Validators.required, Validators.minLength(6)]);
    }
    this.form.controls.contrasena.updateValueAndValidity();

    afterNextRender(() => {
      this.empleadosService.cargar();
      // RolesService ya es reactivo (rolesDisponibles se recalcula solo
      // cuando cambia su lista), pero si este singleton se cargó UNA vez al
      // arrancar la app (p. ej. para el menú) y luego se crean roles nuevos,
      // acá se refresca para no depender de que esa carga inicial siga
      // vigente — mismo patrón que en convenios-lista/aseguradoras.
      this.rolesService.cargar();
    });
  }

  private cargar(u: Usuario): void {
    this.idUsuario.set(u.idUsuario);
    this.form.patchValue({
      nombreUsuario: u.nombreUsuario,
      correo: u.correo,
      idEmpleado: u.idEmpleado,
      idEstadoUsuario: u.idEstadoUsuario,
      requiereCambioPassword: u.requiereCambioPassword,
    });
    this.cargarRoles();
  }

  private cargarRoles(): void {
    this.cargandoRoles.set(true);
    this.errorRoles.set('');
    this.usuariosService.listarRoles(this.idUsuario()).subscribe({
      next: (roles) => {
        this.rolesAsignados.set(roles.filter((r) => r.activo));
        this.cargandoRoles.set(false);
      },
      error: (err: Error) => {
        this.errorRoles.set(err.message);
        this.cargandoRoles.set(false);
      },
    });
  }

  asignarRol(): void {
    const idRol = this.rolParaAsignar();
    if (!idRol) {
      return;
    }
    this.errorRoles.set('');
    this.usuariosService.asignarRol(this.idUsuario(), idRol).subscribe({
      next: () => {
        this.rolParaAsignar.set(null);
        this.cargarRoles();
      },
      error: (err: Error) => this.errorRoles.set(err.message),
    });
  }

  quitarRol(idRol: number, nombreRol: string): void {
    if (!confirm(`¿Quitar el rol "${nombreRol}" a este usuario?`)) {
      return;
    }
    this.errorRoles.set('');
    this.usuariosService.quitarRol(this.idUsuario(), idRol).subscribe({
      next: () => this.cargarRoles(),
      error: (err: Error) => this.errorRoles.set(err.message),
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

    const peticion = this.esNuevo()
      ? this.usuariosService.crear({
          nombreUsuario: v.nombreUsuario.trim(),
          correo: v.correo.trim(),
          contrasena: v.contrasena,
          idEmpleado: v.idEmpleado,
          idEstadoUsuario: v.idEstadoUsuario!,
          requiereCambioPassword: v.requiereCambioPassword,
        })
      : this.usuariosService.actualizar(this.idUsuario(), {
          nombreUsuario: v.nombreUsuario.trim(),
          correo: v.correo.trim(),
          idEmpleado: v.idEmpleado,
          idEstadoUsuario: v.idEstadoUsuario!,
          requiereCambioPassword: v.requiereCambioPassword,
        });

    peticion.subscribe({
      next: () => this.router.navigate(['/home/mantenimiento/usuarios']),
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
      },
    });
  }

  private validarCoincidenciaReset(): void {
    const { contrasenaNueva, repetirContrasenaNueva } = this.resetForm.getRawValue();
    const control = this.resetForm.controls.repetirContrasenaNueva;
    const noCoinciden = !!repetirContrasenaNueva && contrasenaNueva !== repetirContrasenaNueva;

    const { noCoinciden: _ignorado, ...otrosErrores } = control.errors ?? {};
    control.setErrors(noCoinciden ? { ...otrosErrores, noCoinciden: true } : Object.keys(otrosErrores).length ? otrosErrores : null);
  }

  resetearContrasena(): void {
    this.validarCoincidenciaReset();
    this.resetForm.markAllAsTouched();
    if (this.resetForm.invalid) {
      return;
    }
    const v = this.resetForm.getRawValue();
    if (!confirm('¿Resetear la contraseña de este usuario? La contraseña anterior deja de funcionar de inmediato.')) {
      return;
    }

    this.guardandoReset.set(true);
    this.errorReset.set('');
    this.usuariosService.cambiarContrasena(this.idUsuario(), v.contrasenaNueva, v.requiereCambioPassword).subscribe({
      next: () => {
        this.guardandoReset.set(false);
        this.resetForm.reset({ contrasenaNueva: '', repetirContrasenaNueva: '', requiereCambioPassword: true });
        this.snackBar.open('Contraseña reseteada correctamente', 'Cerrar', { duration: 4000 });
      },
      error: (err: Error) => {
        this.errorReset.set(err.message);
        this.guardandoReset.set(false);
      },
    });
  }
}
