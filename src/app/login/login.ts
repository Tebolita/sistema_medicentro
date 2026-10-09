import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';

// servicios
import { AuthService } from '../service/auth.service';
import { PermisosMenuService } from '../service/permisos-menu.service';
import { ApiResponse } from '../models/api-response.model';
import { LoginRequest, LoginData } from '../models/auth.model';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,

  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatCheckboxModule
  ],

  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  errorMsg = signal('');
  userData: LoginRequest = {
    nombreUsuario: '',
    idUsuario: null,
    contrasena: ''
  };

  // injectar permisos en la app
  private authService = inject(AuthService);
  private permisosMenuService = inject(PermisosMenuService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);




  rememberMe: boolean = false;

  mostrarPassword: boolean = false;
  mostrarCodigo: boolean = false;

  constructor() {
    // El interceptor manda acá con esto cuando un 401 lo saca de una
    // pantalla por sesión vencida (ver auth.interceptor.ts) — se avisa en
    // vez de dejar el formulario vacío sin explicación.
    if (this.route.snapshot.queryParamMap.get('sesionVencida')) {
      this.errorMsg.set('Tu sesión expiró. Inicia sesión de nuevo.');
    }
  }


  onLogin(): void {
    if (!this.userData.nombreUsuario || !this.userData.contrasena) {
      this.errorMsg.set('Todos los campos son requeridos');
      return;
    }

    const payload: LoginRequest = {
      nombreUsuario: this.userData.nombreUsuario,
      idUsuario: this.userData.idUsuario,
      contrasena: this.userData.contrasena
    };

    this.errorMsg.set('');


    this.authService.signIn(payload).subscribe({
      next: (response: ApiResponse<LoginData>) => {
        if (!response.exito || !response.datos) {
          this.errorMsg.set(response.mensaje || 'No se pudo iniciar sesión.');
          return;
        }
        // El id de usuario viaja directo en la respuesta (datos.usuario.idUsuario):
        // no hace falta decodificar el JWT para sacarlo.
        try {
          localStorage.setItem('token', response.datos.token);
          localStorage.setItem('id_usuario', String(response.datos.usuario.idUsuario));
        } catch {}
        // Fuerza a recalcular los permisos del menú con el usuario que
        // ACABA de loguearse: PermisosMenuService es un singleton que puede
        // haberse construido antes (sin sesión todavía) y quedarse pegado
        // con esa foto vieja hasta un refresh si no se le avisa.
        this.permisosMenuService.refrescar();
        this.router.navigate(['/home/inicio']);
      },
      error: (err) => {
        this.errorMsg.set(err.message);
      }
  });
  }
}