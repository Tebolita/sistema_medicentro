import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EspecialidadesService } from '../../service/especialidades.service';

type Vista = 'activas' | 'eliminadas';

@Component({
  selector: 'app-especialidades-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './especialidades-lista.html',
  styleUrl: './especialidades-lista.css',
})
export class EspecialidadesLista {
  private especialidadesService = inject(EspecialidadesService);

  buscar = signal('');
  errorAccion = signal('');

  // Pestaña "Eliminadas": por ahora cualquiera con sesión la puede ver.
  // TODO: restringir a admin cuando exista control de roles en el frontend.
  vista = signal<Vista>('activas');
  cargandoEliminadas = this.especialidadesService.cargandoEliminadas;
  errorEliminadas = this.especialidadesService.errorEliminadas;

  cargando = computed(() =>
    this.vista() === 'activas' ? this.especialidadesService.cargando() : this.cargandoEliminadas(),
  );
  errorCarga = computed(() =>
    this.vista() === 'activas' ? this.especialidadesService.errorCarga() : this.errorEliminadas(),
  );

  verActivas(): void {
    this.vista.set('activas');
  }

  verEliminadas(): void {
    this.vista.set('eliminadas');
    if (!this.especialidadesService.listarEliminadas().length) {
      this.especialidadesService.cargarEliminadas();
    }
  }

  especialidades = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista =
      this.vista() === 'activas' ? this.especialidadesService.listar() : this.especialidadesService.listarEliminadas();
    if (!term) {
      return lista;
    }
    return lista.filter((e) => e.nombre.toLowerCase().includes(term));
  });

  eliminar(id: number, nombre: string): void {
    if (!confirm(`¿Dar de baja la especialidad "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.especialidadesService.eliminar(id).subscribe({
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  reactivar(id: number, nombre: string): void {
    if (!confirm(`¿Reactivar la especialidad "${nombre}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.especialidadesService.reactivar(id).subscribe({
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }
}
