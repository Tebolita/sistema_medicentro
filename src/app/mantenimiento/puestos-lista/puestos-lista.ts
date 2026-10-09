import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PuestosService } from '../../service/puestos.service';

type Vista = 'activos' | 'eliminados';

@Component({
  selector: 'app-puestos-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './puestos-lista.html',
  styleUrl: './puestos-lista.css',
})
export class PuestosLista {
  private puestosService = inject(PuestosService);

  buscar = signal('');
  errorAccion = signal('');

  // Pestaña "Eliminados": por ahora cualquiera con sesión la puede ver.
  // TODO: restringir a admin cuando exista control de roles en el frontend.
  vista = signal<Vista>('activos');
  cargandoEliminados = this.puestosService.cargandoEliminados;
  errorEliminados = this.puestosService.errorEliminados;

  cargando = computed(() => (this.vista() === 'activos' ? this.puestosService.cargando() : this.cargandoEliminados()));
  errorCarga = computed(() => (this.vista() === 'activos' ? this.puestosService.errorCarga() : this.errorEliminados()));

  verActivos(): void {
    this.vista.set('activos');
  }

  verEliminados(): void {
    this.vista.set('eliminados');
    if (!this.puestosService.listarEliminados().length) {
      this.puestosService.cargarEliminados();
    }
  }

  puestos = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.vista() === 'activos' ? this.puestosService.listar() : this.puestosService.listarEliminados();
    if (!term) {
      return lista;
    }
    return lista.filter((p) => p.nombre.toLowerCase().includes(term));
  });

  eliminar(id: number, nombre: string): void {
    if (!confirm(`¿Dar de baja el puesto "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.puestosService.eliminar(id).subscribe({
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  reactivar(id: number, nombre: string): void {
    if (!confirm(`¿Reactivar el puesto "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.puestosService.reactivar(id).subscribe({
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }
}
