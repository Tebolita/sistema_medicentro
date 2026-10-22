import { Component, afterNextRender, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MiCuentaDatos, UsuariosService } from '../../service/usuarios.service';

// Pantalla de autoservicio ("Configuración" en el menú del usuario):
// cualquier usuario autenticado ve y edita SU PROPIA cuenta (nombre de
// usuario, correo y contraseña) — a diferencia de Mantenimiento → Usuarios,
// que es el administrador editando a cualquiera.
//
// Usa /api/mi-cuenta (el backend toma el id del token), no /api/usuarios:
// ese es solo para Mantenimiento y a un usuario normal le respondía 403.
@Component({
  selector: 'app-mi-cuenta',
  imports: [ReactiveFormsModule, DatePipe, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './mi-cuenta.html',
  styleUrl: './mi-cuenta.css',
})
export class MiCuenta {
  private fb = inject(FormBuilder);
  private usuariosService = inject(UsuariosService);
  private snackBar = inject(MatSnackBar);

  cuenta = signal<MiCuentaDatos | null>(null);

  cargando = signal(false);
  errorCarga = signal('');

  datosForm = this.fb.nonNullable.group({
    nombreUsuario: ['', Validators.required],
    correo: ['', [Validators.required, Validators.email]],
  });
  guardandoDatos = signal(false);
  errorDatos = signal('');

  // El backend exige la contraseña actual al cambiar la propia.
  passwordForm = this.fb.nonNullable.group({
    contrasenaActual: ['', Validators.required],
    contrasenaNueva: ['', [Validators.required, Validators.minLength(6)]],
    repetirContrasenaNueva: ['', Validators.required],
  });
  guardandoPassword = signal(false);
  errorPassword = signal('');

  constructor() {
    // Se revalida en vivo cada vez que cambia cualquiera de las dos
    // contraseñas nuevas, y el error queda puesto directo en el control de
    // "repetir" (no a nivel de grupo), para que el <mat-error> de ese campo
    // lo recoja igual que cualquier otra validación normal.
    this.passwordForm.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.validarCoincidencia());

    // Solo en el navegador: durante el prerender no hay sesión todavía.
    afterNextRender(() => this.cargar());
  }

  private cargar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.usuariosService.obtenerMiCuenta().subscribe({
      next: (c) => {
        this.cuenta.set(c);
        this.datosForm.reset({ nombreUsuario: c.nombreUsuario, correo: c.correo });
        this.cargando.set(false);
      },
      error: (err: Error) => {
        this.errorCarga.set(err.message);
        this.cargando.set(false);
      },
    });
  }

  guardarDatos(): void {
    this.datosForm.markAllAsTouched();
    if (this.datosForm.invalid || !this.cuenta()) {
      return;
    }
    const v = this.datosForm.getRawValue();

    this.guardandoDatos.set(true);
    this.errorDatos.set('');
    this.usuariosService.actualizarMiCuenta({ nombreUsuario: v.nombreUsuario.trim(), correo: v.correo.trim() }).subscribe({
      next: (u) => {
        this.cuenta.update((c) => (c ? { ...c, nombreUsuario: u.nombreUsuario, correo: u.correo } : c));
        this.datosForm.reset({ nombreUsuario: u.nombreUsuario, correo: u.correo });
        this.guardandoDatos.set(false);
        this.snackBar.open('Datos actualizados correctamente', 'Cerrar', { duration: 4000 });
      },
      error: (err: Error) => {
        this.errorDatos.set(err.message);
        this.guardandoDatos.set(false);
      },
    });
  }

  // Compara "nueva" contra "repetir" y pone/quita el error justo en el
  // control de "repetir", sin tocar sus otros errores (p. ej. "required").
  private validarCoincidencia(): void {
    const { contrasenaNueva, repetirContrasenaNueva } = this.passwordForm.getRawValue();
    const control = this.passwordForm.controls.repetirContrasenaNueva;
    const noCoinciden = !!repetirContrasenaNueva && contrasenaNueva !== repetirContrasenaNueva;

    const { noCoinciden: _ignorado, ...otrosErrores } = control.errors ?? {};
    control.setErrors(noCoinciden ? { ...otrosErrores, noCoinciden: true } : Object.keys(otrosErrores).length ? otrosErrores : null);
  }

  cambiarContrasena(): void {
    this.validarCoincidencia();
    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.invalid) {
      return;
    }
    const v = this.passwordForm.getRawValue();

    this.guardandoPassword.set(true);
    this.errorPassword.set('');
    this.usuariosService.cambiarMiContrasena(v.contrasenaActual, v.contrasenaNueva).subscribe({
      next: () => {
        this.guardandoPassword.set(false);
        this.passwordForm.reset({ contrasenaActual: '', contrasenaNueva: '', repetirContrasenaNueva: '' });
        this.cuenta.update((c) => (c ? { ...c, requiereCambioPassword: false } : c));
        this.snackBar.open('Contraseña actualizada correctamente', 'Cerrar', { duration: 4000 });
      },
      error: (err: Error) => {
        this.errorPassword.set(err.message);
        this.guardandoPassword.set(false);
      },
    });
  }
}
