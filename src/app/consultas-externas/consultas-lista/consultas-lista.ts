import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConsultasExternasService } from '../consultas-externas.service';
import { ESTADOS_CITA, MEDICOS, TIPOS_CONSULTA } from '../consultas-catalogos';
import { PacientesService } from '../../pacientes/pacientes.service';

@Component({
  selector: 'app-consultas-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './consultas-lista.html',
  styleUrl: './consultas-lista.css',
})
export class ConsultasLista {
  private consultasService = inject(ConsultasExternasService);
  private pacientesService = inject(PacientesService);

  buscar = signal('');

  consultas = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.consultasService.listar();
    if (!term) {
      return lista;
    }
    return lista.filter((c) =>
      [this.nombrePaciente(c.idPaciente), this.medicoLabel(c.idMedico), c.motivoConsulta]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

  nombrePaciente(idPaciente: number): string {
    const p = this.pacientesService.listar().find((pac) => pac.idPaciente === idPaciente);
    if (!p) {
      return 'Paciente no encontrado';
    }
    return [p.primerNombre, p.segundoNombre, p.primerApellido, p.segundoApellido].filter(Boolean).join(' ');
  }

  iniciales(idPaciente: number): string {
    const nombre = this.nombrePaciente(idPaciente);
    const partes = nombre.split(' ').filter(Boolean);
    return `${partes[0]?.charAt(0) ?? ''}${partes[1]?.charAt(0) ?? ''}`.toUpperCase();
  }

  medicoLabel(idMedico: number | null): string {
    return MEDICOS.find((m) => m.id === idMedico)?.nombre ?? '—';
  }

  tipoConsultaLabel(idTipoConsulta: number | null): string {
    return TIPOS_CONSULTA.find((t) => t.id === idTipoConsulta)?.label ?? '—';
  }

  estadoLabel(idEstadoCita: number): string {
    return ESTADOS_CITA.find((e) => e.id === idEstadoCita)?.label ?? '—';
  }

  estadoClase(idEstadoCita: number): string {
    if (idEstadoCita === 4) return 'estado-atendida';
    if (idEstadoCita === 5) return 'estado-cancelada';
    if (idEstadoCita === 3) return 'estado-en-atencion';
    return 'estado-programada';
  }

  formatFechaHora(iso: string): string {
    const fecha = new Date(iso);
    return fecha.toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  eliminar(id: number, paciente: string): void {
    if (!confirm(`¿Eliminar la consulta de "${paciente}"?`)) {
      return;
    }
    this.consultasService.eliminar(id);
  }
}
