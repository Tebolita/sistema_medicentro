import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MedicamentosService } from '../../service/medicamentos.service';

@Component({
  selector: 'app-medicamentos-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './medicamentos-lista.html',
  styleUrl: './medicamentos-lista.css',
})
export class MedicamentosLista {
  private medicamentosService = inject(MedicamentosService);

  buscar = signal('');
  errorAccion = signal('');
  cargando = this.medicamentosService.cargando;
  errorCarga = this.medicamentosService.errorCarga;

  constructor() {
    // Solo en el navegador: durante el prerender no hay backend ni sesión.
    afterNextRender(() => this.medicamentosService.cargar());
  }

  medicamentos = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.medicamentosService.listar();
    if (!term) {
      return lista;
    }
    return lista.filter((m) =>
      [m.nombre, m.principioActivo, m.presentacion].filter(Boolean).join(' ').toLowerCase().includes(term),
    );
  });

  eliminar(id: number, nombre: string): void {
    if (!confirm(`¿Dar de baja el medicamento "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.medicamentosService.eliminar(id).subscribe({
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }
}
