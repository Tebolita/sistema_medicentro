import { Component, ElementRef, afterNextRender, computed, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { FacturasService } from '../../service/facturas.service';
import { FORMAS_PAGO } from '../facturacion-catalogos';
import { PacientesService } from '../../pacientes/pacientes.service';

@Component({
  selector: 'app-pagos-lista',
  imports: [FormsModule, RouterLink, MatIconModule, MatButtonModule],
  templateUrl: './pagos-lista.html',
  styleUrl: './pagos-lista.css',
})
export class PagosLista {
  private facturasService = inject(FacturasService);
  private pacientesService = inject(PacientesService);
  private route = inject(ActivatedRoute);

  searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  buscar = signal('');
  buscando = computed(() => this.buscar().trim().length > 0);
  resaltarBusqueda = signal(false);

  cargando = this.facturasService.cargando;
  errorCarga = this.facturasService.errorCarga;

  constructor() {
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

  pagos = computed(() => {
    const term = this.buscar().trim().toLowerCase();
    const lista = this.facturasService.listarPagos();
    if (!term) {
      return lista;
    }
    return lista.filter((p) =>
      [this.pacienteDeFactura(p.idFactura), this.numeroDocumento(p.idFactura)]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(term),
    );
  });

  numeroDocumento(idFactura: number): string {
    return this.facturasService.obtener(idFactura)?.factura.numeroDocumento ?? '—';
  }

  pacienteDeFactura(idFactura: number): string {
    const idPaciente = this.facturasService.obtener(idFactura)?.factura.idPaciente;
    const p = this.pacientesService.directorio().find((pac) => pac.idPaciente === idPaciente);
    return p ? [p.primerNombre, p.primerApellido].filter(Boolean).join(' ') : 'Paciente no encontrado';
  }

  formaPagoLabel(idFormaPago: number): string {
    return FORMAS_PAGO.find((f) => f.id === idFormaPago)?.label ?? '—';
  }

  formatFecha(iso: string): string {
    return new Date(iso).toLocaleString('es-GT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  }

  formatMonto(monto: number): string {
    return `Q${monto.toFixed(2)}`;
  }
}
