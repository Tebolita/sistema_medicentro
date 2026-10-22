import { Component, ElementRef, afterNextRender, computed, inject, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MENU_SECTIONS, MenuItem, MenuSection } from '../shared/menu-data';
import { PermisosMenuService } from '../service/permisos-menu.service';

interface OpcionBuscador {
  icono: string;
  label: string;
  seccion: string;
  route: string;
  queryParams?: Record<string, string>;
}

// Ctrl+Shift+B (ver home.ts) abre esto encima de todo. Junta Inicio + cada
// MenuSection (su propio overview) + cada MenuItem en una sola lista
// buscable, filtrada con el MISMO PermisosMenuService que ya usa el menú
// lateral: si el usuario no puede ver una sección ahí, tampoco aparece acá.
@Component({
  selector: 'app-buscador-rapido',
  imports: [FormsModule, MatIconModule],
  templateUrl: './buscador-rapido.html',
  styleUrl: './buscador-rapido.css',
})
export class BuscadorRapido {
  private router = inject(Router);
  private permisosMenu = inject(PermisosMenuService);

  cerrar = output<void>();

  termino = signal('');
  resaltado = signal(0);

  private inputBuscador = viewChild<ElementRef<HTMLInputElement>>('inputBuscador');

  constructor() {
    afterNextRender(() => this.inputBuscador()?.nativeElement.focus());
  }

  private opciones = computed<OpcionBuscador[]>(() => {
    const permitidos = this.permisosMenu.modulosPermitidos();
    const secciones: MenuSection[] = permitidos ? MENU_SECTIONS.filter((s) => permitidos.has(s.slug)) : [];

    const lista: OpcionBuscador[] = [
      { icono: 'dashboard', label: 'Inicio', seccion: '', route: '/home/inicio' },
    ];

    for (const seccion of secciones) {
      lista.push({
        icono: seccion.icon,
        label: seccion.title,
        seccion: 'Módulo',
        route: seccion.route ?? `/home/modulo/${seccion.slug}`,
      });
      for (const item of seccion.items as MenuItem[]) {
        if (!item.route) {
          continue;
        }
        lista.push({
          icono: item.icon,
          label: item.label,
          seccion: seccion.title,
          route: item.route,
          queryParams: item.queryParams,
        });
      }
    }
    return lista;
  });

  resultados = computed<OpcionBuscador[]>(() => {
    const term = this.termino().trim().toLowerCase();
    const todas = this.opciones();
    if (!term) {
      return todas;
    }
    return todas.filter((o) => `${o.label} ${o.seccion}`.toLowerCase().includes(term));
  });

  onTermino(valor: string): void {
    this.termino.set(valor);
    this.resaltado.set(0);
  }

  mover(delta: number): void {
    const total = this.resultados().length;
    if (!total) {
      return;
    }
    this.resaltado.update((i) => (i + delta + total) % total);
  }

  seleccionarResaltado(): void {
    const opcion = this.resultados()[this.resaltado()];
    if (opcion) {
      this.ir(opcion);
    }
  }

  ir(opcion: OpcionBuscador): void {
    this.router.navigate([opcion.route], { queryParams: opcion.queryParams ?? {} });
    this.cerrar.emit();
  }
}
