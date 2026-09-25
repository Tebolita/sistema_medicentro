import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CompromisoPago, CompromisosPagoService } from '../compromisos-pago.service';
import { ESTADOS_CONSENTIMIENTO, PARENTESCOS } from '../emergencias-catalogos';
import { MEDICOS } from '../../consultas-externas/consultas-catalogos';
import { PacientesService } from '../../pacientes/pacientes.service';

@Component({
  selector: 'app-compromisos-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './compromisos-lista.html',
  styleUrl: './compromisos-lista.css',
})
export class CompromisosLista {
  private compromisosService = inject(CompromisosPagoService);
  private pacientesService = inject(PacientesService);

  buscar = signal('');
  buscando = computed(() => this.buscar().trim().length > 0);

  compromisos = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.compromisosService.listar();
    if (!term) {
      return lista;
    }
    return lista.filter((c) =>
      [this.nombrePaciente(c.consentimiento.idPaciente), c.nombreResponsable]
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

  medicoLabel(idMedico: number): string {
    return MEDICOS.find((m) => m.id === idMedico)?.nombre ?? '—';
  }

  parentescoLabel(idParentesco: number): string {
    return PARENTESCOS.find((p) => p.id === idParentesco)?.label ?? '—';
  }

  estadoLabel(idEstadoConsentimiento: number): string {
    return ESTADOS_CONSENTIMIENTO.find((e) => e.id === idEstadoConsentimiento)?.label ?? '—';
  }

  estadoClase(idEstadoConsentimiento: number): string {
    if (idEstadoConsentimiento === 2) return 'estado-firmado';
    if (idEstadoConsentimiento === 3) return 'estado-revocado';
    return 'estado-pendiente';
  }

  formatFecha(iso: string | null): string {
    if (!iso) {
      return 'Sin firmar';
    }
    return new Date(iso).toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  eliminar(id: number, paciente: string): void {
    if (!confirm(`¿Eliminar el compromiso de pago de "${paciente}"?`)) {
      return;
    }
    this.compromisosService.eliminar(id);
  }
}
