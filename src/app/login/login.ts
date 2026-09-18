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
import { ApiResponse } from '../models/api-response.model';
import { LoginRequest } from '../models/auth.model';
import { Router } from '@angular/router';

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
  private router = inject(Router);




  rememberMe: boolean = false;

  mostrarPassword: boolean = false;
  mostrarCodigo: boolean = false;


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
      next: (response: ApiResponse<any>) => {
        if (response.exito) {
          // Guardar token y datos del usuario en localStorage o sessionStorage
          localStorage.setItem('token', response.datos.token);
          // localStorage.setItem('usuario', JSON.stringify(response.datos.usuario));
        }
        try {
          const payload = JSON.parse(atob(response.datos.access_token.split('.')[1]));
          if (payload.sub) localStorage.setItem('id_usuario', String(payload.sub));
        } catch {}
        this.router.navigate(['/home/inicio']);
      },
      error: (err) => {
        this.errorMsg.set(err.message);
      }
  }); 
  }
}