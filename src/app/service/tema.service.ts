import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

const CLAVE = 'tema';

// Tema claro/oscuro del sistema. Empieza en claro y la elección se recuerda
// en localStorage. El atributo data-theme
// también lo pone un script en index.html antes de pintar, para que no haya
// un destello de tema claro al recargar.
@Injectable({ providedIn: 'root' })
export class TemaService {
  private document = inject(DOCUMENT);

  oscuro = signal(this.leerInicial());

  constructor() {
    effect(() => {
      const oscuro = this.oscuro();
      this.document.documentElement.setAttribute('data-theme', oscuro ? 'dark' : 'light');
      try {
        localStorage.setItem(CLAVE, oscuro ? 'dark' : 'light');
      } catch {
        // sin localStorage (SSR o navegación privada): el tema solo dura la sesión
      }
    });
  }

  alternar(): void {
    this.oscuro.update((v) => !v);
  }

  private leerInicial(): boolean {
    try {
      // Claro por defecto; solo es oscuro si la persona lo eligió antes.
      return localStorage.getItem(CLAVE) === 'dark';
    } catch {
      return false;
    }
  }
}
