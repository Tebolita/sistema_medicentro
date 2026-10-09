import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AseguradorasService } from '../../service/aseguradoras.service';

type Vista = 'activas' | 'eliminadas';

@Component({
  selector: 'app-aseguradoras-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './aseguradoras-lista.html',
  styleUrl: './aseguradoras-lista.css',
})
export class AseguradorasLista {
  private aseguradorasService = inject(AseguradorasService);

  buscar = signal('');
  errorAccion = signal('');

  // Pestaña "Eliminadas": por ahora cualquiera con sesión la puede ver.
  // TODO: restringir a admin cuando exista control de roles en el frontend.
  vista = signal<Vista>('activas');
  cargandoEliminadas = this.aseguradorasService.cargandoEliminadas;
  errorEliminadas = this.aseguradorasService.errorEliminadas;

  cargando = computed(() =>
    this.vista() === 'activas' ? this.aseguradorasService.cargando() : this.cargandoEliminadas(),
  );
  errorCarga = computed(() =>
    this.vista() === 'activas' ? this.aseguradorasService.errorCarga() : this.errorEliminadas(),
  );

  verActivas(): void {
    this.vista.set('activas');
  }

  verEliminadas(): void {
    this.vista.set('eliminadas');
    if (!this.aseguradorasService.listarEliminadas().length) {
      this.aseguradorasService.cargarEliminadas();
    }
  }

  aseguradoras = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista =
      this.vista() === 'activas' ? this.aseguradorasService.listar() : this.aseguradorasService.listarEliminadas();
    if (!term) {
      return lista;
    }
    return lista.filter((a) =>
      [a.nombre, a.nit, a.telefono, a.correo].filter(Boolean).join(' ').toLowerCase().includes(term),
    );
  });

  eliminar(id: number, nombre: string): void {
    if (!confirm(`¿Dar de baja la aseguradora "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.aseguradorasService.eliminar(id).subscribe({
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  reactivar(id: number, nombre: string): void {
    if (!confirm(`¿Reactivar la aseguradora "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.aseguradorasService.reactivar(id).subscribe({
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }
}
