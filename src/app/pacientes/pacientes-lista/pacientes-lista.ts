import { Component, ElementRef, PLATFORM_ID, computed, inject, signal, viewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { MENU_SECTIONS } from '../../shared/menu-data';

import { PacienteService } from '../../service/paciente.service';
import { CatalogoService } from '../../service/catalogo.service';
import { PacienteListado } from '../../models/paciente.model';
import { CatalogoOpcion, CODIGOS_CATALOGO } from '../../models/catalogo.model';

@Component({
  selector: 'app-pacientes-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './pacientes-lista.html',
  styleUrl: './pacientes-lista.css',
})
export class PacientesLista {
  private pacienteService = inject(PacienteService);
  private catalogoService = inject(CatalogoService);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);

  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  buscar = signal('');

  // Mientras se busca, se ocultan recientes/opciones para dar una vista
  // más centrada en los resultados (menos ruido visual).
  buscando = computed(() => this.buscar().trim().length > 0);

  // "Búsqueda de expediente" (menú) trae ?foco=buscar para distinguirse de
  // solo entrar a "Recepción": en vez de aterrizar en la misma vista general,
  // enfoca directo el buscador y lo resalta un momento.
  resaltarBusqueda = signal(false);

  // Datos reales desde la API (/api/Pacientes y /api/catalogos).
  private lista = signal<PacienteListado[]>([]);
  private tiposDocumento = signal<CatalogoOpcion[]>([]);
  private estadosPaciente = signal<CatalogoOpcion[]>([]);

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      if (params.get('foco') !== 'buscar') {
        return;
      }
      this.resaltarBusqueda.set(true);
      queueMicrotask(() => this.searchInput()?.nativeElement.focus());
      setTimeout(() => this.resaltarBusqueda.set(false), 1600);
    });

    // En el prerender (servidor) no hay sesión ni token: solo se consulta
    // la API desde el navegador.
    if (isPlatformBrowser(this.platformId)) {
      this.cargarCatalogos();
      this.cargarPacientes();
    }
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
    const lista = this.lista();
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
  mostrarRecientes = computed(() => this.lista().length > 1);

  recientes = computed(() =>
    [...this.lista()]
      .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion))
      .slice(0, 5),
  );

  private cargarPacientes(): void {
    this.pacienteService.RetornarPacientes().subscribe({
      next: (resp) => this.lista.set(resp.datos ?? []),
      error: (err: Error) => alert('No se pudieron cargar los pacientes: ' + err.message),
    });
  }

  private cargarCatalogos(): void {
    forkJoin({
      documentos: this.catalogoService.RetornarCatalogo(CODIGOS_CATALOGO.TIPO_DOCUMENTO),
      estados: this.catalogoService.RetornarCatalogo(CODIGOS_CATALOGO.ESTADO_PACIENTE),
    }).subscribe({
      next: (r) => {
        this.tiposDocumento.set(r.documentos.datos ?? []);
        this.estadosPaciente.set(r.estados.datos ?? []);
      },
      error: (err: Error) => console.error('Catálogos de pacientes:', err.message),
    });
  }

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
    return this.tiposDocumento().find((t) => t.id === idTipoDocumento)?.nombre ?? '—';
  }

  estadoLabel(idEstadoPaciente: number): string {
    return this.estadosPaciente().find((e) => e.id === idEstadoPaciente)?.nombre ?? '—';
  }

  eliminar(id: number, nombre: string): void {
    if (!confirm(`¿Eliminar al paciente "${nombre}"? Esto no borra su expediente, solo lo marca como inactivo.`)) {
      return;
    }
    this.pacienteService.EliminarPaciente(id).subscribe({
      next: () => this.lista.update((l) => l.filter((p) => p.idPaciente !== id)),
      error: (err: Error) => alert('No se pudo eliminar: ' + err.message),
    });
  }
}