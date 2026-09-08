import { Component, computed, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MENU_SECTIONS, MenuItem, MenuSection } from '../shared/menu-data';

interface MenuSectionState extends MenuSection {
  expanded: boolean;
}

@Component({
  selector: 'app-menu',
  imports: [
    FormsModule,
    RouterLink,
    RouterLinkActive,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatListModule,
    MatTooltipModule,
  ],
  templateUrl: './menu.html',
  styleUrl: './menu.css',
})
export class Menu {
  private router = inject(Router);

  collapsed = signal(false);
  collapsedChange = output<boolean>();

  // URL exacta actual (con query params), usada para resaltar solo el ítem
  // que realmente coincide y no cualquier otro cuya ruta sea un prefijo
  // (p.ej. "/home/pacientes" es prefijo de "/home/pacientes/nuevo") ni un
  // "hermano" que apunta a la misma ruta con distintos queryParams (p.ej.
  // "Validación Mediprocesos" vs "Copago consulta / hospital", ambos en
  // /home/polizas).
  currentUrl = signal(this.router.url);

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe((event) => this.currentUrl.set(event.urlAfterRedirects));
  }

  isItemActive(item: MenuItem): boolean {
    if (!item.route) {
      return false;
    }
    const [path, queryString] = this.currentUrl().split('?');
    if (path !== item.route) {
      return false;
    }
    const currentParams = new URLSearchParams(queryString ?? '');
    const itemParams = Object.entries(item.queryParams ?? {});
    if (itemParams.length === 0) {
      // Sin queryParams propios: solo es "el" activo cuando no hay ningún
      // query param puesto por un hermano (si lo hubiera, currentParams no
      // estaría vacío).
      return [...currentParams.keys()].length === 0;
    }
    return itemParams.every(([key, value]) => currentParams.get(key) === value);
  }

  toggle(): void {
    this.collapsed.update((value) => !value);
    this.collapsedChange.emit(this.collapsed());
  }

  toggleSection(section: MenuSectionState): void {
    section.expanded = !section.expanded;
  }

  searchTerm = signal('');
  isSearching = computed(() => this.searchTerm().trim().length > 0);

  inicio: MenuItem = { icon: 'dashboard', label: 'Inicio', route: '/home/inicio' };

  sections: MenuSectionState[] = MENU_SECTIONS.map((section) => ({
    ...section,
    expanded: false,
  }));

  filteredSections = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    if (!term) {
      return this.sections;
    }
    return this.sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.label.toLowerCase().includes(term)),
      }))
      .filter((section) => section.items.length > 0);
  });
}
