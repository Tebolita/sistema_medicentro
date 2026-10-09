import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DIAS_SEMANA, DisponibilidadesService } from '../../service/disponibilidades.service';
import { MedicosService } from '../../service/medicos.service';

type Vista = 'activas' | 'eliminadas';

@Component({
  selector: 'app-disponibilidad-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './disponibilidad-lista.html',
  styleUrl: './disponibilidad-lista.css',
})
export class DisponibilidadLista {
  private disponibilidadesService = inject(DisponibilidadesService);
  private medicosService = inject(MedicosService);

  buscar = signal('');
  errorAccion = signal('');

  // Pestaña "Eliminadas": por ahora cualquiera con sesión la puede ver.
  // TODO: restringir a admin cuando exista control de roles en el frontend.
  vista = signal<Vista>('activas');
  cargandoEliminadas = this.disponibilidadesService.cargandoEliminadas;
  errorEliminadas = this.disponibilidadesService.errorEliminadas;

  cargando = computed(() => (this.vista() === 'activas' ? this.disponibilidadesService.cargando() : this.cargandoEliminadas()));
  errorCarga = computed(() => (this.vista() === 'activas' ? this.disponibilidadesService.errorCarga() : this.errorEliminadas()));

  constructor() {
    afterNextRender(() => this.medicosService.cargar());
  }

  verActivas(): void {
    this.vista.set('activas');
  }

  verEliminadas(): void {
    this.vista.set('eliminadas');
    if (!this.disponibilidadesService.listarEliminadas().length) {
      this.disponibilidadesService.cargarEliminadas();
    }
  }

  diaLabel(idDiaSemana: number): string {
    return DIAS_SEMANA.find((d) => d.id === idDiaSemana)?.label ?? `Día ${idDiaSemana}`;
  }

  medicoNombre(idMedico: number): string {
    return this.medicosService.nombreDe(idMedico);
  }

  disponibilidades = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.vista() === 'activas' ? this.disponibilidadesService.listar() : this.disponibilidadesService.listarEliminadas();
    if (!term) {
      return lista;
    }
    return lista.filter((d) =>
      [this.medicoNombre(d.idMedico), this.diaLabel(d.idDiaSemana)].join(' ').toLowerCase().includes(term),
    );
  });

  eliminar(id: number, etiqueta: string): void {
    if (!confirm(`¿Dar de baja la disponibilidad de "${etiqueta}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.disponibilidadesService.eliminar(id).subscribe({
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  reactivar(id: number, etiqueta: string): void {
    if (!confirm(`¿Reactivar la disponibilidad de "${etiqueta}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.disponibilidadesService.reactivar(id).subscribe({
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }
}
