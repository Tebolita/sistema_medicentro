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

import { PolizaService } from '../../service/poliza.service';
import { AseguradoraService } from '../../service/aseguradora.service';
import { PacienteService } from '../../service/paciente.service';
import { CatalogoService } from '../../service/catalogo.service';
import { PolizaSeguro, AseguradoraListado } from '../../models/seguro.model';
import { PacienteListado } from '../../models/paciente.model';
import { CatalogoOpcion, CODIGOS_CATALOGO } from '../../models/catalogo.model';

@Component({
  selector: 'app-polizas-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './polizas-lista.html',
  styleUrl: './polizas-lista.css',
})
export class PolizasLista {
  private polizaService = inject(PolizaService);
  private aseguradoraService = inject(AseguradoraService);
  private pacienteService = inject(PacienteService);
  private catalogoService = inject(CatalogoService);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);

  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  buscar = signal('');
  buscando = computed(() => this.buscar().trim().length > 0);
  resaltarBusqueda = signal(false);

  // "Copago consulta / hospital" y "Gestión seguro Mi Cope" ya tienen su
  // propia ruta (lista y registro); acá solo queda "Validación Mediprocesos",
  // que enfoca el buscador en vez de repetir la misma vista general.
  opcionesSeguros = (MENU_SECTIONS.find((s) => s.slug === 'seguros-medicos')?.items ?? []).filter(
    (item) => item.route !== '/home/polizas' || item.queryParams,
  );

  // Datos reales desde la API (ya no hay datos de ejemplo).
  private lista = signal<PolizaSeguro[]>([]);
  private pacientesApi = signal<PacienteListado[]>([]);
  private aseguradoras = signal<AseguradoraListado[]>([]);
  private ramos = signal<CatalogoOpcion[]>([]);
  private estados = signal<CatalogoOpcion[]>([]);

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      if (params.get('foco') !== 'buscar') {
        return;
      }
      this.resaltarBusqueda.set(true);
      queueMicrotask(() => this.searchInput()?.nativeElement.focus());
      setTimeout(() => this.resaltarBusqueda.set(false), 1600);
    });

    // En el servidor (SSR) no hay sesión ni token: solo se consulta desde el navegador.
    if (isPlatformBrowser(this.platformId)) {
      this.cargar();
    }
  }

  private cargar(): void {
    forkJoin({
      polizas: this.polizaService.RetornarPolizas(),
      pacientes: this.pacienteService.RetornarPacientes(),
      aseguradoras: this.aseguradoraService.RetornarAseguradoras(),
      ramos: this.catalogoService.RetornarCatalogo(CODIGOS_CATALOGO.RAMO_SEGURO),
      estados: this.catalogoService.RetornarCatalogo(CODIGOS_CATALOGO.ESTADO_POLIZA),
    }).subscribe({
      next: (r) => {
        this.lista.set(r.polizas.datos ?? []);
        this.pacientesApi.set(r.pacientes.datos ?? []);
        this.aseguradoras.set(r.aseguradoras.datos ?? []);
        this.ramos.set(r.ramos.datos ?? []);
        this.estados.set(r.estados.datos ?? []);
      },
      error: (err: Error) => alert('No se pudieron cargar las pólizas: ' + err.message),
    });
  }

  polizas = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.lista();
    if (!term) {
      return lista;
    }
    return lista.filter((p) =>
      [this.nombrePaciente(p.idPaciente), this.aseguradoraLabel(p.idAseguradora), p.numeroPoliza, p.codigoAutorizacion]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

  nombrePaciente(idPaciente: number): string {
    const p = this.pacientesApi().find((pac) => pac.idPaciente === idPaciente);
    if (!p) {
      return 'Paciente no encontrado';
    }
    return [p.primerNombre, p.segundoNombre, p.primerApellido, p.segundoApellido].filter(Boolean).join(' ');
  }

  iniciales(idPaciente: number): string {
    const partes = this.nombrePaciente(idPaciente).split(' ').filter(Boolean);
    return `${partes[0]?.charAt(0) ?? ''}${partes[1]?.charAt(0) ?? ''}`.toUpperCase();
  }

  aseguradoraLabel(idAseguradora: number): string {
    return this.aseguradoras().find((a) => a.idAseguradora === idAseguradora)?.nombre ?? '—';
  }

  ramoLabel(idRamo: number): string {
    return this.ramos().find((r) => r.id === idRamo)?.nombre ?? '—';
  }

  estadoLabel(idEstadoPoliza: number): string {
    return this.estados().find((e) => e.id === idEstadoPoliza)?.nombre ?? '—';
  }

  // Se compara por código (VIGENTE/VENCIDA/SUSPENDIDA): los ids dependen de cada base.
  estadoClase(idEstadoPoliza: number): string {
    const codigo = this.estados().find((e) => e.id === idEstadoPoliza)?.codigo;
    if (codigo === 'VENCIDA') return 'estado-vencida';
    if (codigo === 'SUSPENDIDA') return 'estado-suspendida';
    return 'estado-vigente';
  }

  copagoTexto(porcentaje: number | null, monto: number | null): string {
    if (porcentaje != null) return `${porcentaje}% copago`;
    if (monto != null) return `Q${monto.toFixed(2)} copago`;
    return 'Sin copago definido';
  }

  eliminar(id: number, paciente: string): void {
    if (!confirm(`¿Eliminar la póliza de "${paciente}"?`)) {
      return;
    }
    this.polizaService.EliminarPoliza(id).subscribe({
      next: () => this.lista.update((l) => l.filter((p) => p.idPoliza !== id)),
      error: (err: Error) => alert('No se pudo eliminar la póliza: ' + err.message),
    });
  }
}