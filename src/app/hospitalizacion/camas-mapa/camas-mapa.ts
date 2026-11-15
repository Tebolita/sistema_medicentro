import { Component, afterNextRender, computed, inject } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HabitacionesService } from '../../service/habitaciones.service';
import { HospitalizacionesService } from '../../service/hospitalizaciones.service';
import { PacientesService } from '../../service/pacientes.service';
import { CatalogosService } from '../../service/catalogos.service';

interface CamaVista {
  idCama: number;
  numeroCama: string;
  estadoCodigo: string;
  estadoLabel: string;
  idHospitalizacion: number | null;
  nombrePaciente: string | null;
}

interface HabitacionVista {
  idHabitacion: number;
  numero: string;
  piso: number | null;
  camas: CamaVista[];
}

// Vista en div (no canvas: así cada cama es un elemento real con su propio
// tooltip/enlace, accesible y sin necesidad de volver a dibujar al cambiar
// de tamaño) de todas las habitaciones y sus camas, coloreadas según
// ESTADO_CAMA, con el paciente que la ocupa si está OCUPADA. Se arma en el
// cliente combinando tres fuentes que ya existen por separado (ver
// SOLICITUD de "ver camas disponibles por habitación"): HabitacionesService
// (habitación + camas + estado de cada cama), HospitalizacionesService.activas()
// (qué hospitalización ACTIVA ocupa cada cama) y PacientesService (nombre).
@Component({
  selector: 'app-camas-mapa',
  imports: [NgClass, RouterLink, MatIconModule, MatTooltipModule],
  templateUrl: './camas-mapa.html',
  styleUrl: './camas-mapa.css',
})
export class CamasMapa {
  private habitacionesService = inject(HabitacionesService);
  private hospitalizacionesService = inject(HospitalizacionesService);
  private pacientesService = inject(PacientesService);
  private catalogosService = inject(CatalogosService);

  private estadosCama = this.catalogosService.obtener('ESTADO_CAMA');

  cargando = this.habitacionesService.cargando;
  errorCarga = this.habitacionesService.errorCarga;

  constructor() {
    afterNextRender(() => {
      this.habitacionesService.cargar();
      this.pacientesService.cargarDirectorio();
    });
  }

  private nombrePaciente(idPaciente: number): string {
    const p = this.pacientesService.directorio().find((pac) => pac.idPaciente === idPaciente);
    return p ? [p.primerNombre, p.primerApellido].filter(Boolean).join(' ') : `Paciente #${idPaciente}`;
  }

  habitaciones = computed<HabitacionVista[]>(() => {
    const activas = this.hospitalizacionesService.activas();
    const estados = this.estadosCama();

    return this.habitacionesService.listar().map((h) => ({
      idHabitacion: h.habitacion.idHabitacion,
      numero: h.habitacion.numero,
      piso: h.habitacion.piso,
      camas: h.camas
        .filter((c) => c.activo)
        .sort((a, b) => a.numeroCama.localeCompare(b.numeroCama))
        .map((c) => {
          const estado = estados.find((e) => e.id === c.idEstadoCama);
          const ocupante = activas.find((r) => r.hospitalizacion.idCama === c.idCama);
          return {
            idCama: c.idCama,
            numeroCama: c.numeroCama,
            estadoCodigo: estado?.codigo ?? '—',
            estadoLabel: estado?.nombre ?? 'Desconocido',
            idHospitalizacion: ocupante?.hospitalizacion.idHospitalizacion ?? null,
            nombrePaciente: ocupante ? this.nombrePaciente(ocupante.hospitalizacion.idPaciente) : null,
          };
        }),
    }));
  });

  totales = computed(() => {
    const todas = this.habitaciones().flatMap((h) => h.camas);
    return {
      total: todas.length,
      libres: todas.filter((c) => c.estadoCodigo === 'LIBRE').length,
      ocupadas: todas.filter((c) => c.estadoCodigo === 'OCUPADA').length,
      otras: todas.filter((c) => c.estadoCodigo !== 'LIBRE' && c.estadoCodigo !== 'OCUPADA').length,
    };
  });

  claseCama(cama: CamaVista): string {
    if (cama.estadoCodigo === 'LIBRE') return 'cama-libre';
    if (cama.estadoCodigo === 'OCUPADA') return 'cama-ocupada';
    return 'cama-otro';
  }
}
