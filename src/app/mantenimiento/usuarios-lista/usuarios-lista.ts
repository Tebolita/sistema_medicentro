import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UsuariosService } from '../../service/usuarios.service';
import { CatalogosService } from '../../service/catalogos.service';

// ESTADO_USUARIO ya se siembra junto con el usuario inicial
// (scripts/insertar_usuario.sql): ACTIVO / BLOQUEADO / INACTIVO.
const ESTADOS_USUARIO_EJEMPLO = [
  { id: 1, label: 'Activo' },
  { id: 2, label: 'Bloqueado' },
  { id: 3, label: 'Inactivo' },
];

@Component({
  selector: 'app-usuarios-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './usuarios-lista.html',
  styleUrl: './usuarios-lista.css',
})
export class UsuariosLista {
  private usuariosService = inject(UsuariosService);

  buscar = signal('');
  errorAccion = signal('');
  cargando = this.usuariosService.cargando;
  errorCarga = this.usuariosService.errorCarga;

  private catalogos = inject(CatalogosService);
  private estadosApi = this.catalogos.obtener('ESTADO_USUARIO');
  private estados = computed(() => {
    const api = this.estadosApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : ESTADOS_USUARIO_EJEMPLO;
  });

  constructor() {
    // Solo en el navegador: durante el prerender no hay backend ni sesión.
    afterNextRender(() => this.usuariosService.cargar());
  }

  usuarios = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.usuariosService.listar();
    if (!term) {
      return lista;
    }
    return lista.filter((u) => [u.nombreUsuario, u.correo].join(' ').toLowerCase().includes(term));
  });

  estadoLabel(idEstadoUsuario: number): string {
    return this.estados().find((e) => e.id === idEstadoUsuario)?.label ?? '—';
  }

  eliminar(id: number, nombre: string): void {
    if (!confirm(`¿Dar de baja al usuario "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.usuariosService.eliminar(id).subscribe({
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }
}
