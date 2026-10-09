import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  PapeleraService,
  RECURSOS_PAPELERA,
  RECURSOS_SOLO_LECTURA,
  RecursoPapelera,
  RegistroEliminado,
} from '../../service/papelera.service';
import { UsuariosService } from '../../service/usuarios.service';
import { nombreGrupo } from '../../shared/menu-data';

interface GrupoDeRecursos {
  nombre: string;
  recursos: RecursoPapelera[];
}

@Component({
  selector: 'app-papelera',
  imports: [
    FormsModule,
    RouterLink,
    MatFormFieldModule,
    MatSelectModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './papelera.html',
  styleUrl: './papelera.css',
})
export class Papelera {
  private papeleraService = inject(PapeleraService);
  private usuariosService = inject(UsuariosService);

  // Agrupados igual que el menú/Catálogos (mismo "grupo" que ya usan los
  // demás módulos), para que el selector no sea una lista plana de 30.
  grupos: GrupoDeRecursos[] = (() => {
    const orden: string[] = [];
    const porGrupo = new Map<string, RecursoPapelera[]>();
    for (const r of RECURSOS_PAPELERA) {
      const nombre = nombreGrupo(r.grupo);
      if (!porGrupo.has(nombre)) {
        orden.push(nombre);
        porGrupo.set(nombre, []);
      }
      porGrupo.get(nombre)!.push(r);
    }
    return orden.map((nombre) => ({ nombre, recursos: porGrupo.get(nombre)! }));
  })();

  recursoSeleccionado = signal<RecursoPapelera | null>(null);
  esSoloLectura = computed(() => {
    const r = this.recursoSeleccionado();
    return !!r && RECURSOS_SOLO_LECTURA.has(r.recurso);
  });

  registros = signal<RegistroEliminado[]>([]);
  cargando = signal(false);
  errorCarga = signal('');
  errorAccion = signal('');
  buscar = signal('');

  registrosFiltrados = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    if (!term) {
      return this.registros();
    }
    return this.registros().filter((r) => [r.titulo, r.detalle].filter(Boolean).join(' ').toLowerCase().includes(term));
  });

  constructor() {
    // Necesario para resolver "quién" (idUsuarioModificacion -> nombreUsuario)
    // en quienYCuando(); mismo motivo que el fix de usuario-formulario: no
    // depender de que este singleton ya haya cargado antes por casualidad.
    afterNextRender(() => this.usuariosService.cargar());
  }

  compararRecursos(a: RecursoPapelera | null, b: RecursoPapelera | null): boolean {
    return a?.recurso === b?.recurso;
  }

  // "Eliminado el 9 oct 2026 por kreyes" — se arma solo con lo que el DTO
  // de ese recurso en particular alcance a dar (ver nota en papelera.service.ts).
  quienYCuando(registro: RegistroEliminado): string | null {
    const fecha = registro.fecha
      ? new Date(registro.fecha).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;
    const quien =
      registro.idUsuario != null
        ? this.usuariosService.obtener(registro.idUsuario)?.nombreUsuario ?? `usuario #${registro.idUsuario}`
        : null;

    if (fecha && quien) return `Eliminado el ${fecha} por ${quien}`;
    if (fecha) return `Eliminado el ${fecha}`;
    if (quien) return `Eliminado por ${quien}`;
    return null;
  }

  seleccionar(recurso: RecursoPapelera | null): void {
    this.recursoSeleccionado.set(recurso);
    this.registros.set([]);
    this.errorCarga.set('');
    this.errorAccion.set('');
    this.buscar.set('');
    if (recurso) {
      this.cargar(recurso);
    }
  }

  private cargar(recurso: RecursoPapelera): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.papeleraService.listar(recurso).subscribe({
      next: (registros) => {
        this.registros.set(registros);
        this.cargando.set(false);
      },
      error: (err: Error) => {
        this.errorCarga.set(err.message);
        this.cargando.set(false);
      },
    });
  }

  reactivar(registro: RegistroEliminado): void {
    const recurso = this.recursoSeleccionado();
    if (!recurso) {
      return;
    }
    if (!confirm(`¿Reactivar "${registro.titulo}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.papeleraService.reactivar(recurso, registro.id).subscribe({
      next: () => this.registros.update((lista) => lista.filter((r) => r.id !== registro.id)),
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }
}
