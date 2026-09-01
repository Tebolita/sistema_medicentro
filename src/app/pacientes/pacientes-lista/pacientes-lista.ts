import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PacientesService } from '../pacientes.service';
import { ESTADOS_PACIENTE, TIPOS_DOCUMENTO } from '../pacientes-catalogos';
import { MENU_SECTIONS } from '../../shared/menu-data';

@Component({
  selector: 'app-pacientes-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './pacientes-lista.html',
  styleUrl: './pacientes-lista.css',
})
export class PacientesLista {
  private pacientesService = inject(PacientesService);
  private route = inject(ActivatedRoute);

  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  buscar = signal('');

  // Mientras se busca, se ocultan recientes/opciones para dar una vista
  // más centrada en los resultados (menos ruido visual).
  buscando = computed(() => this.buscar().trim().length > 0);

  // "Búsqueda de expediente" (menú) trae ?foco=buscar para distinguirse de
  // solo entrar a "Recepción": en vez de aterrizar en la misma vista general,
  // enfoca directo el buscador y lo resalta un momento.
  resaltarBusqueda = signal(false);

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      if (params.get('foco') !== 'buscar') {
        return;
      }
      this.resaltarBusqueda.set(true);
      queueMicrotask(() => this.searchInput()?.nativeElement.focus());
      setTimeout(() => this.resaltarBusqueda.set(false), 1600);
    });
  }

  // El módulo "Recepción" del menú ahora entra directo a esta pantalla, así
  // que sus demás opciones (aún no cada una con pantalla propia) se muestran
  // aquí abajo para no perderlas. "Búsqueda de expediente" se omite: ya está
  // resuelta por el buscador de arriba, mostrarla también aquí era redundante.
  opcionesRecepcion = (MENU_SECTIONS.find((s) => s.slug === 'recepcion')?.items ?? []).filter(
    (item) => item.route !== '/home/pacientes',
  );

  pacientes = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.pacientesService.listar();
    if (!term) {
      return lista;
    }
    return lista.filter((p) =>
      [p.codigoExpediente, p.primerNombre, p.segundoNombre, p.primerApellido, p.segundoApellido, p.numeroDocumento]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

  // Últimos 5 expedientes, solo cuando hay más de un paciente registrado
  // (con uno solo no aporta nada mostrar un "recientes" aparte de la lista).
  mostrarRecientes = computed(() => this.pacientesService.listar().length > 1);

  recientes = computed(() =>
    [...this.pacientesService.listar()]
      .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion))
      .slice(0, 5),
  );

  nombreCompleto(p: {
    primerNombre: string;
    segundoNombre: string | null;
    primerApellido: string;
    segundoApellido: string | null;
  }): string {
    return [p.primerNombre, p.segundoNombre, p.primerApellido, p.segundoApellido].filter(Boolean).join(' ');
  }

  iniciales(p: { primerNombre: string; primerApellido: string }): string {
    return `${p.primerNombre.charAt(0)}${p.primerApellido.charAt(0)}`.toUpperCase();
  }

  documentoLabel(idTipoDocumento: number | null): string {
    return TIPOS_DOCUMENTO.find((t) => t.id === idTipoDocumento)?.label ?? '—';
  }

  estadoLabel(idEstadoPaciente: number): string {
    return ESTADOS_PACIENTE.find((e) => e.id === idEstadoPaciente)?.label ?? '—';
  }

  eliminar(id: number, nombre: string): void {
    if (!confirm(`¿Eliminar al paciente "${nombre}"? Esto no borra su expediente, solo lo marca como inactivo.`)) {
      return;
    }
    this.pacientesService.eliminar(id);
  }
}
