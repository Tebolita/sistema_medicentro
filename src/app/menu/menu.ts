import { Component, computed, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
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
  collapsed = signal(false);
  collapsedChange = output<boolean>();

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
