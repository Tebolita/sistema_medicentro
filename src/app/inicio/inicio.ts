import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MENU_SECTIONS } from '../shared/menu-data';
import { PermisosMenuService } from '../service/permisos-menu.service';

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, MatIconModule],
  templateUrl: './inicio.html',
  styleUrl: './inicio.css',
})
export class Inicio {
  private permisosMenu = inject(PermisosMenuService);

  // Mismo filtro que el menú lateral (PermisosMenuService): null significa
  // "mostrar todas" (sin permisos configurados todavía o mientras cargan).
  sections = computed(() => {
    const permitidos = this.permisosMenu.modulosPermitidos();
    return permitidos ? MENU_SECTIONS.filter((s) => permitidos.has(s.slug)) : MENU_SECTIONS;
  });
}
