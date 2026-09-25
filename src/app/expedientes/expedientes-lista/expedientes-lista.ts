import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ExpedientesService } from '../expedientes.service';
import { TIPOS_REGISTRO_CLINICO } from '../expedientes-catalogos';
import { MEDICOS } from '../../consultas-externas/consultas-catalogos';
import { PacientesService } from '../../pacientes/pacientes.service';

@Component({
  selector: 'app-expedientes-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './expedientes-lista.html',
  styleUrl: './expedientes-lista.css',
})
export class ExpedientesLista {
  private expedientesService = inject(ExpedientesService);
  private pacientesService = inject(PacientesService);
  private route = inject(ActivatedRoute);

  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  buscar = signal('');
  buscando = computed(() => this.buscar().trim().length > 0);
  resaltarBusqueda = signal(false);

  // Filtro de tipo de registro que llega desde el menú (Ficha pediátrica /
  // externa / evolución / paciente ingresado). null = mostrar todos.
  tipoFiltro = signal<number | null>(null);
  tiposRegistro = TIPOS_REGISTRO_CLINICO;

  constructor() {
    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const tipo = params.get('tipo');
      this.tipoFiltro.set(tipo ? Number(tipo) : null);

      if (params.get('foco') === 'buscar') {
        this.resaltarBusqueda.set(true);
        queueMicrotask(() => this.searchInput()?.nativeElement.focus());
        setTimeout(() => this.resaltarBusqueda.set(false), 1600);
      }
    });
  }

  expedientes = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const tipo = this.tipoFiltro();
    let lista = this.expedientesService.listar();
    if (tipo != null) {
      lista = lista.filter((h) => h.idTipoRegistro === tipo);
    }
    if (!term) {
      return lista;
    }
    return lista.filter((h) =>
      [this.nombrePaciente(h.idPaciente), h.motivoConsulta, h.diagnostico, h.notas]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

  tipoFiltroLabel(): string {
    return this.tiposRegistro.find((t) => t.id === this.tipoFiltro())?.label ?? '';
  }

  limpiarFiltroTipo(): void {
    this.tipoFiltro.set(null);
  }

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

  medicoLabel(idMedico: number): string {
    return MEDICOS.find((m) => m.id === idMedico)?.nombre ?? '—';
  }

  tipoLabel(idTipoRegistro: number): string {
    return this.tiposRegistro.find((t) => t.id === idTipoRegistro)?.label ?? '—';
  }

  resumen(h: { motivoConsulta: string | null; diagnostico: string | null; notas: string | null }): string {
    return h.diagnostico || h.motivoConsulta || h.notas || 'Sin detalle registrado';
  }

  formatFecha(iso: string): string {
    const fecha = new Date(iso);
    return fecha.toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  eliminar(id: number, paciente: string): void {
    if (!confirm(`¿Eliminar el registro clínico de "${paciente}"?`)) {
      return;
    }
    this.expedientesService.eliminar(id);
  }
}
