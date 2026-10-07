import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProveedoresService } from '../../service/proveedores.service';

@Component({
  selector: 'app-proveedores-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './proveedores-lista.html',
  styleUrl: './proveedores-lista.css',
})
export class ProveedoresLista {
  private proveedoresService = inject(ProveedoresService);

  buscar = signal('');
  errorAccion = signal('');
  cargando = this.proveedoresService.cargando;
  errorCarga = this.proveedoresService.errorCarga;

  constructor() {
    // Solo en el navegador: durante el prerender no hay backend ni sesión.
    afterNextRender(() => this.proveedoresService.cargar());
  }

  proveedores = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.proveedoresService.listar();
    if (!term) {
      return lista;
    }
    return lista.filter((p) =>
      [p.nombre, p.nit, p.telefono, p.correo].filter(Boolean).join(' ').toLowerCase().includes(term),
    );
  });

  eliminar(id: number, nombre: string): void {
    if (!confirm(`¿Dar de baja al proveedor "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.proveedoresService.eliminar(id).subscribe({
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }
}
