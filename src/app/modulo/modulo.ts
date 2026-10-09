import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GrupoDeItems, MENU_SECTIONS, agruparItems } from '../shared/menu-data';

@Component({
  selector: 'app-modulo',
  imports: [RouterLink, MatIconModule, MatTooltipModule],
  templateUrl: './modulo.html',
  styleUrl: './modulo.css',
})
export class Modulo {
  private route = inject(ActivatedRoute);

  private slug = signal('');

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      this.slug.set(params.get('slug') ?? '');
    });
  }

  section = computed(() => MENU_SECTIONS.find((s) => s.slug === this.slug()) ?? null);

  // Si los items del módulo tienen "grupo" (hoy solo Mantenimiento), se
  // muestran agrupados con un encabezado por grupo; si no, en un solo grupo
  // sin encabezado, igual que antes.
  grupos = computed<GrupoDeItems[]>(() => agruparItems(this.section()?.items ?? []));
}
