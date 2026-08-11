import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  // Modelo simple del formulario
  username: string = '';
  password: string = '';
  codigo: string = '';
  rememberMe: boolean = false;

  // Controla si la contraseña se muestra en texto plano
  mostrarPassword: boolean = false;

    mostrarCodigo: boolean = false;

  onLogin(): void {
    // Aquí conectas con tu servicio/API de autenticación (Node.js backend)
    console.log('Usuario:', this.username);
    console.log('Password:', this.password);
    console.log('Codigo:', this.codigo);
    console.log('Recuérdame:', this.rememberMe);
  }
}
