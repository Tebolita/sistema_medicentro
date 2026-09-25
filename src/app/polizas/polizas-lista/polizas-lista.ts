import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PolizasService } from '../polizas.service';
import { ASEGURADORAS, ESTADOS_POLIZA, RAMOS_SEGURO } from '../polizas-catalogos';
import { PacientesService } from '../../pacientes/pacientes.service';
import { MENU_SECTIONS } from '../../shared/menu-data';

@Component({
  selector: 'app-polizas-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './polizas-lista.html',
  styleUrl: './polizas-lista.css',
})
export class PolizasLista {
  private polizasService = inject(PolizasService);
  private pacientesService = inject(PacientesService);
  private route = inject(ActivatedRoute);

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

  polizas = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.polizasService.listar();
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
    const p = this.pacientesService.directorio().find((pac) => pac.idPaciente === idPaciente);
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
    return ASEGURADORAS.find((a) => a.id === idAseguradora)?.nombre ?? '—';
  }

  ramoLabel(idRamo: number): string {
    return RAMOS_SEGURO.find((r) => r.id === idRamo)?.label ?? '—';
  }

  estadoLabel(idEstadoPoliza: number): string {
    return ESTADOS_POLIZA.find((e) => e.id === idEstadoPoliza)?.label ?? '—';
  }

  estadoClase(idEstadoPoliza: number): string {
    if (idEstadoPoliza === 2) return 'estado-vencida';
    if (idEstadoPoliza === 3) return 'estado-suspendida';
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
    this.polizasService.eliminar(id);
  }
}
