import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HabitacionesService } from '../../service/habitaciones.service';
import { CatalogosService } from '../../service/catalogos.service';
import { TIPOS_HABITACION, ESTADOS_HABITACION } from '../habitaciones-catalogos';

type Vista = 'activas' | 'eliminadas';

@Component({
  selector: 'app-habitaciones-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './habitaciones-lista.html',
  styleUrl: './habitaciones-lista.css',
})
export class HabitacionesLista {
  private habitacionesService = inject(HabitacionesService);

  private catalogos = inject(CatalogosService);
  private tiposApi = this.catalogos.obtener('TIPO_HABITACION');
  private tipos = computed(() => {
    const api = this.tiposApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : TIPOS_HABITACION;
  });
  private estadosApi = this.catalogos.obtener('ESTADO_HABITACION');
  private estados = computed(() => {
    const api = this.estadosApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : ESTADOS_HABITACION;
  });

  buscar = signal('');
  errorAccion = signal('');

  // Pestaña "Eliminadas": por ahora cualquiera con sesión la puede ver.
  // TODO: restringir a admin cuando exista control de roles en el frontend.
  vista = signal<Vista>('activas');
  cargandoEliminadas = this.habitacionesService.cargandoEliminadas;
  errorEliminadas = this.habitacionesService.errorEliminadas;

  cargando = computed(() =>
    this.vista() === 'activas' ? this.habitacionesService.cargando() : this.cargandoEliminadas(),
  );
  errorCarga = computed(() =>
    this.vista() === 'activas' ? this.habitacionesService.errorCarga() : this.errorEliminadas(),
  );

  verActivas(): void {
    this.vista.set('activas');
  }

  verEliminadas(): void {
    this.vista.set('eliminadas');
    if (!this.habitacionesService.listarEliminadas().length) {
      this.habitacionesService.cargarEliminadas();
    }
  }

  habitaciones = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista =
      this.vista() === 'activas' ? this.habitacionesService.listar() : this.habitacionesService.listarEliminadas();
    if (!term) {
      return lista;
    }
    return lista.filter((r) => r.habitacion.numero.toLowerCase().includes(term));
  });

  tipoLabel(idTipoHabitacion: number | null): string {
    if (!idTipoHabitacion) {
      return 'Sin tipo';
    }
    return this.tipos().find((t) => t.id === idTipoHabitacion)?.label ?? '—';
  }

  estadoLabel(idEstadoHabitacion: number): string {
    return this.estados().find((e) => e.id === idEstadoHabitacion)?.label ?? '—';
  }

  eliminar(id: number, numero: string): void {
    if (!confirm(`¿Dar de baja la habitación "${numero}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.habitacionesService.eliminar(id).subscribe({
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  reactivar(id: number, numero: string): void {
    if (!confirm(`¿Reactivar la habitación "${numero}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.habitacionesService.reactivar(id).subscribe({
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }
}
