import { Component, afterNextRender, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../service/auth.service';
import { Usuario, UsuariosService } from '../../service/usuarios.service';

// Pantalla de autoservicio: cualquier usuario autenticado edita SU PROPIA
// cuenta (nombre de usuario, correo y contraseña) — a diferencia de
// Mantenimiento → Usuarios, que es el administrador editando a cualquiera.
@Component({
  selector: 'app-mi-cuenta',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './mi-cuenta.html',
  styleUrl: './mi-cuenta.css',
})
export class MiCuenta {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private usuariosService = inject(UsuariosService);
  private snackBar = inject(MatSnackBar);

  private idUsuario = signal<number | null>(null);
  private registro = signal<Usuario | undefined>(undefined);

  cargando = signal(false);
  errorCarga = signal('');

  datosForm = this.fb.nonNullable.group({
    nombreUsuario: ['', Validators.required],
    correo: ['', [Validators.required, Validators.email]],
  });
  guardandoDatos = signal(false);
  errorDatos = signal('');

  // El backend no pide ni verifica la contraseña actual al cambiarla (ver
  // usuarios.service.ts), así que no se le pregunta al usuario — pedirla
  // daría la falsa impresión de que protege algo que en realidad no se
  // revisa del otro lado.
  passwordForm = this.fb.nonNullable.group({
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
    afterNextRender(() => {
      const id = this.authService.idUsuarioActual();
      if (!id) {
        this.errorCarga.set('No se pudo identificar tu sesión. Vuelve a iniciar sesión.');
        return;
      }
      this.idUsuario.set(id);
      this.cargando.set(true);
      this.usuariosService.obtenerPorId(id).subscribe({
        next: (u) => {
          this.registro.set(u);
          this.datosForm.patchValue({ nombreUsuario: u.nombreUsuario, correo: u.correo });
          this.cargando.set(false);
        },
        error: (err: Error) => {
          this.errorCarga.set(err.message);
          this.cargando.set(false);
        },
      });
    });
  }

  guardarDatos(): void {
    this.datosForm.markAllAsTouched();
    const id = this.idUsuario();
    const original = this.registro();
    if (this.datosForm.invalid || !id || !original) {
      return;
    }
    const v = this.datosForm.getRawValue();

    this.guardandoDatos.set(true);
    this.errorDatos.set('');
    // El estado/empleado/flag de cambio de contraseña no se tocan desde
    // acá: se reenvían tal como ya estaban (esta pantalla no es la de
    // administración de usuarios).
    this.usuariosService
      .actualizar(id, {
        nombreUsuario: v.nombreUsuario.trim(),
        correo: v.correo.trim(),
        idEmpleado: original.idEmpleado,
        idEstadoUsuario: original.idEstadoUsuario,
        requiereCambioPassword: original.requiereCambioPassword,
      })
      .subscribe({
        next: (actualizado) => {
          this.registro.set(actualizado);
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
    const id = this.idUsuario();
    if (this.passwordForm.invalid || !id) {
      return;
    }
    const v = this.passwordForm.getRawValue();

    this.guardandoPassword.set(true);
    this.errorPassword.set('');
    this.usuariosService.cambiarContrasena(id, v.contrasenaNueva).subscribe({
      next: () => {
        this.guardandoPassword.set(false);
        this.passwordForm.reset({ contrasenaNueva: '', repetirContrasenaNueva: '' });
        this.snackBar.open('Contraseña actualizada correctamente', 'Cerrar', { duration: 4000 });
      },
      error: (err: Error) => {
        this.errorPassword.set(err.message);
        this.guardandoPassword.set(false);
      },
    });
  }
}
