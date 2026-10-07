import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RolesService } from '../../service/roles.service';

@Component({
  selector: 'app-roles-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './roles-lista.html',
  styleUrl: './roles-lista.css',
})
export class RolesLista {
  private rolesService = inject(RolesService);

  buscar = signal('');
  errorAccion = signal('');
  cargando = this.rolesService.cargando;
  errorCarga = this.rolesService.errorCarga;

  constructor() {
    // Solo en el navegador: durante el prerender no hay backend ni sesión.
    afterNextRender(() => this.rolesService.cargar());
  }

  roles = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.rolesService.listar();
    if (!term) {
      return lista;
    }
    return lista.filter((r) => [r.nombre, r.descripcion].filter(Boolean).join(' ').toLowerCase().includes(term));
  });

  eliminar(id: number, nombre: string): void {
    if (!confirm(`¿Dar de baja el rol "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.rolesService.eliminar(id).subscribe({
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }
}
