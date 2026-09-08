import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CasoEmergencia, CasosEmergenciaService } from '../casos-emergencia.service';
import { ESTADOS_CASO, NIVELES_TRIAGE } from '../emergencias-catalogos';
import { MEDICOS } from '../../consultas-externas/consultas-catalogos';
import { PacientesService } from '../../pacientes/pacientes.service';
import { MENU_SECTIONS } from '../../shared/menu-data';

@Component({
  selector: 'app-casos-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './casos-lista.html',
  styleUrl: './casos-lista.css',
})
export class CasosLista {
  private casosService = inject(CasosEmergenciaService);
  private pacientesService = inject(PacientesService);

  buscar = signal('');
  buscando = computed(() => this.buscar().trim().length > 0);

  // "Atención prioritaria" ya es esta misma pantalla; se omite para no
  // mostrar un chip redundante que lleve al mismo lugar donde ya se está.
  opcionesEmergencias = (MENU_SECTIONS.find((s) => s.slug === 'emergencias')?.items ?? []).filter(
    (item) => item.route !== '/home/emergencias',
  );

  // La sala de emergencias se ordena por urgencia (triaje), no por hora de
  // llegada, para que el caso más crítico siempre aparezca primero.
  casos = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    let lista = this.casosService.listar();
    if (term) {
      lista = lista.filter((c) =>
        [this.nombrePaciente(c), c.motivo]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(term),
      );
    }
    return [...lista].sort((a, b) => a.idNivelTriage - b.idNivelTriage);
  });

  nombrePaciente(c: CasoEmergencia): string {
    if (c.idPaciente == null) {
      return c.nombrePaciente || 'Paciente no identificado';
    }
    const p = this.pacientesService.listar().find((pac) => pac.idPaciente === c.idPaciente);
    if (!p) {
      return 'Paciente no encontrado';
    }
    return [p.primerNombre, p.segundoNombre, p.primerApellido, p.segundoApellido].filter(Boolean).join(' ');
  }

  iniciales(c: CasoEmergencia): string {
    const partes = this.nombrePaciente(c).split(' ').filter(Boolean);
    return `${partes[0]?.charAt(0) ?? ''}${partes[1]?.charAt(0) ?? ''}`.toUpperCase();
  }

  medicoLabel(idMedico: number | null): string {
    return MEDICOS.find((m) => m.id === idMedico)?.nombre ?? 'Sin asignar';
  }

  triageLabel(idNivelTriage: number): string {
    return NIVELES_TRIAGE.find((n) => n.id === idNivelTriage)?.label ?? '—';
  }

  triageClase(idNivelTriage: number): string {
    return `triage-${idNivelTriage}`;
  }

  estadoLabel(idEstadoCaso: number): string {
    return ESTADOS_CASO.find((e) => e.id === idEstadoCaso)?.label ?? '—';
  }

  estadoClase(idEstadoCaso: number): string {
    if (idEstadoCaso === 3) return 'estado-atendido';
    if (idEstadoCaso === 4) return 'estado-referido';
    if (idEstadoCaso === 2) return 'estado-en-atencion';
    return 'estado-esperando';
  }

  formatHora(iso: string): string {
    return new Date(iso).toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit' });
  }

  eliminar(id: number, paciente: string): void {
    if (!confirm(`¿Eliminar el caso de "${paciente}"?`)) {
      return;
    }
    this.casosService.eliminar(id);
  }
}
