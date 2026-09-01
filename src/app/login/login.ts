import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';

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

  username: string = '';
  password: string = '';
  codigo: string = '';

  rememberMe: boolean = false;

  mostrarPassword: boolean = false;
  mostrarCodigo: boolean = false;


  onLogin(): void {

    console.log('==============================');
    console.log('INICIO DE SESIÓN');
    console.log('USUARIO:', this.username);
    console.log('CÓDIGO:', this.codigo);
    console.log('CONTRASEÑA:', this.password);
    console.log('RECUÉRDAME:', this.rememberMe);
    console.log('==============================');

  }

}