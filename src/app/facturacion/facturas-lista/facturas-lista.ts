import { Component, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FacturasService } from '../../service/facturas.service';
import { ESTADOS_FACTURA } from '../facturacion-catalogos';
import { PacientesService } from '../../pacientes/pacientes.service';
import { MENU_SECTIONS } from '../../shared/menu-data';

@Component({
  selector: 'app-facturas-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './facturas-lista.html',
  styleUrl: './facturas-lista.css',
})
export class FacturasLista {
  private facturasService = inject(FacturasService);
  private pacientesService = inject(PacientesService);
  private route = inject(ActivatedRoute);

  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  buscar = signal('');
  buscando = computed(() => this.buscar().trim().length > 0);
  resaltarBusqueda = signal(false);

  opcionesFacturacion = MENU_SECTIONS.find((s) => s.slug === 'facturacion-cobros')?.items ?? [];

  cargando = this.facturasService.cargando;
  errorCarga = this.facturasService.errorCarga;
  errorAccion = signal('');

  constructor() {
    // Solo en el navegador: durante el prerender no hay backend ni sesión.
    afterNextRender(() => this.facturasService.cargar());

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      if (params.get('foco') !== 'buscar') {
        return;
      }
      this.resaltarBusqueda.set(true);
      queueMicrotask(() => this.searchInput()?.nativeElement.focus());
      setTimeout(() => this.resaltarBusqueda.set(false), 1600);
    });
  }

  facturas = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.facturasService.listar();
    if (!term) {
      return lista;
    }
    return lista.filter((r) =>
      [this.nombrePaciente(r.factura.idPaciente), r.factura.numeroDocumento]
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

  estadoLabel(idEstadoFactura: number): string {
    return ESTADOS_FACTURA.find((e) => e.id === idEstadoFactura)?.label ?? '—';
  }

  estadoClase(idEstadoFactura: number): string {
    if (idEstadoFactura === 2) return 'estado-pagada';
    if (idEstadoFactura === 3) return 'estado-anulada';
    return 'estado-emitida';
  }

  esDigefact(idPoliza: number | null): boolean {
    return idPoliza != null;
  }

  formatFecha(iso: string): string {
    return new Date(iso).toLocaleString('es-GT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  formatMonto(monto: number): string {
    return `Q${monto.toFixed(2)}`;
  }

  eliminar(id: number, paciente: string): void {
    if (!confirm(`¿Anular la factura de "${paciente}"?`)) {
      return;
    }
    this.errorAccion.set('');
    this.facturasService.eliminar(id).subscribe({
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }
}
