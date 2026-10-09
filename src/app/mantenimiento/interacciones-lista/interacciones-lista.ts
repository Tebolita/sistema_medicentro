import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InteraccionesService } from '../../service/interacciones.service';
import { MedicamentosService } from '../../service/medicamentos.service';
import { CatalogosService } from '../../service/catalogos.service';

type Vista = 'activas' | 'eliminadas';

// Mismos códigos/ids de ejemplo que ya usa Pacientes para 'SEVERIDAD'
// (pacientes-catalogos.ts) — mientras ese catálogo no esté sembrado.
const SEVERIDADES_EJEMPLO = [
  { id: 1, label: 'Leve' },
  { id: 2, label: 'Moderada' },
  { id: 3, label: 'Severa' },
];

@Component({
  selector: 'app-interacciones-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './interacciones-lista.html',
  styleUrl: './interacciones-lista.css',
})
export class InteraccionesLista {
  private interaccionesService = inject(InteraccionesService);
  private medicamentosService = inject(MedicamentosService);

  private catalogos = inject(CatalogosService);
  private severidadApi = this.catalogos.obtener('SEVERIDAD');
  private severidades = computed(() => {
    const api = this.severidadApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : SEVERIDADES_EJEMPLO;
  });

  buscar = signal('');
  errorAccion = signal('');

  // Pestaña "Eliminadas": por ahora cualquiera con sesión la puede ver.
  // TODO: restringir a admin cuando exista control de roles en el frontend.
  vista = signal<Vista>('activas');
  cargandoEliminadas = this.interaccionesService.cargandoEliminadas;
  errorEliminadas = this.interaccionesService.errorEliminadas;

  cargando = computed(() => (this.vista() === 'activas' ? this.interaccionesService.cargando() : this.cargandoEliminadas()));
  errorCarga = computed(() => (this.vista() === 'activas' ? this.interaccionesService.errorCarga() : this.errorEliminadas()));

  constructor() {
    afterNextRender(() => this.medicamentosService.cargar());
  }

  verActivas(): void {
    this.vista.set('activas');
  }

  verEliminadas(): void {
    this.vista.set('eliminadas');
    if (!this.interaccionesService.listarEliminadas().length) {
      this.interaccionesService.cargarEliminadas();
    }
  }

  medicamentoNombre(id: number): string {
    return this.medicamentosService.obtener(id)?.nombre ?? `Medicamento #${id}`;
  }

  severidadLabel(id: number): string {
    return this.severidades().find((s) => s.id === id)?.label ?? '—';
  }

  interacciones = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.vista() === 'activas' ? this.interaccionesService.listar() : this.interaccionesService.listarEliminadas();
    if (!term) {
      return lista;
    }
    return lista.filter((i) =>
      [this.medicamentoNombre(i.idMedicamento1), this.medicamentoNombre(i.idMedicamento2), i.descripcion]
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

  eliminar(id: number, etiqueta: string): void {
    if (!confirm(`¿Dar de baja la interacción "${etiqueta}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.interaccionesService.eliminar(id).subscribe({
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }

  reactivar(id: number, etiqueta: string): void {
    if (!confirm(`¿Reactivar la interacción "${etiqueta}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.interaccionesService.reactivar(id).subscribe({
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }
}
