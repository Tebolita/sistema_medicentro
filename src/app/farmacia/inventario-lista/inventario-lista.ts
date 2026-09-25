import { Component, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { InventarioFarmaciaService } from '../../service/inventario-farmacia.service';
import { ESTADOS_ITEM_INVENTARIO, UNIDADES_MEDIDA } from '../farmacia-catalogos';
import { MENU_SECTIONS } from '../../shared/menu-data';

@Component({
  selector: 'app-inventario-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './inventario-lista.html',
  styleUrl: './inventario-lista.css',
})
export class InventarioLista {
  private inventarioService = inject(InventarioFarmaciaService);
  private route = inject(ActivatedRoute);

  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  buscar = signal('');
  buscando = computed(() => this.buscar().trim().length > 0);
  resaltarBusqueda = signal(false);

  opcionesFarmacia = MENU_SECTIONS.find((s) => s.slug === 'farmacia')?.items ?? [];

  cargando = this.inventarioService.cargando;
  errorCarga = this.inventarioService.errorCarga;

  constructor() {
    // Solo en el navegador: durante el prerender no hay backend ni sesión.
    afterNextRender(() => this.inventarioService.cargar());
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      if (params.get('foco') !== 'buscar') {
        return;
      }
      this.resaltarBusqueda.set(true);
      queueMicrotask(() => this.searchInput()?.nativeElement.focus());
      setTimeout(() => this.resaltarBusqueda.set(false), 1600);
    });
  }

  items = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.inventarioService.listar();
    if (!term) {
      return lista;
    }
    return lista.filter((i) => i.nombre.toLowerCase().includes(term));
  });

  unidadLabel(idUnidadMedida: number): string {
    return UNIDADES_MEDIDA.find((u) => u.id === idUnidadMedida)?.label ?? '—';
  }

  estadoLabel(idEstadoItem: number): string {
    return ESTADOS_ITEM_INVENTARIO.find((e) => e.id === idEstadoItem)?.label ?? '—';
  }

  porcentajeStock(stockActual: number, stockMinimo: number): number {
    const referencia = stockMinimo * 3 || 1;
    return Math.min(100, Math.round((stockActual / referencia) * 100));
  }
}
