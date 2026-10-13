import {Component, HostListener, signal} from '@angular/core';
import {MatSidenavModule} from '@angular/material/sidenav';
import {Menu} from '../menu/menu';
import {Header} from '../header/header';
import { RouterOutlet } from '@angular/router';
import { BuscadorRapido } from '../buscador-rapido/buscador-rapido';

@Component({
  selector: 'app-home',
  imports: [MatSidenavModule, Menu, Header, RouterOutlet, BuscadorRapido],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  menuCollapsed = signal(false);

  // El menú lateral (mat-drawer) por defecto se cierra solo con Escape y se
  // queda así (su "opened" no estaba atado a nada que lo pudiera volver a
  // abrir). Se controla acá para que Escape lo abra/cierre como toggle en
  // vez de solo desaparecer sin forma de volver.
  menuAbierto = signal(true);
  buscadorAbierto = signal(false);

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    const tecla = event.key.toLowerCase();

    // Ctrl+Shift+B (o Cmd+Shift+B en mac) — abre el buscador rápido. Se
    // intercepta con preventDefault porque algunos navegadores usan ese
    // mismo atajo para su propia barra de marcadores.
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && tecla === 'b') {
      event.preventDefault();
      this.buscadorAbierto.set(true);
      return;
    }

    if (tecla === 'escape') {
      if (this.buscadorAbierto()) {
        this.buscadorAbierto.set(false);
        return;
      }
      this.menuAbierto.update((v) => !v);
    }
  }
}
