import { Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FacturasService } from '../facturas.service';
import { FORMAS_PAGO } from '../facturacion-catalogos';
import { PacientesService } from '../../pacientes/pacientes.service';

@Component({
  selector: 'app-pago-formulario',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './pago-formulario.html',
  styleUrl: './pago-formulario.css',
})
export class PagoFormulario {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private facturasService = inject(FacturasService);
  private pacientesService = inject(PacientesService);

  facturasPendientes = computed(() => this.facturasService.listar().filter((r) => r.factura.idEstadoFactura === 1));
  formasPago = FORMAS_PAGO;

  form = this.fb.nonNullable.group({
    idFactura: this.fb.control<number | null>(null, Validators.required),
    monto: [0, [Validators.required, Validators.min(0.01)]],
    idFormaPago: this.fb.control<number | null>(null, Validators.required),
    referenciaPago: [''],
  });

  nombrePaciente(idPaciente: number): string {
    const p = this.pacientesService.listar().find((pac) => pac.idPaciente === idPaciente);
    return p ? [p.primerNombre, p.primerApellido].filter(Boolean).join(' ') : '—';
  }

  onFacturaSeleccionada(idFactura: number): void {
    const factura = this.facturasService.obtener(idFactura);
    if (factura) {
      const saldo = factura.factura.total - this.facturasService.totalPagado(idFactura);
      this.form.patchValue({ monto: Math.max(0, saldo) });
    }
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    this.facturasService.registrarPago({
      idFactura: v.idFactura!,
      fechaPago: new Date().toISOString(),
      monto: v.monto,
      idFormaPago: v.idFormaPago!,
      idEstadoPago: 1,
      referenciaPago: v.referenciaPago || null,
      observaciones: null,
      fechaCreacion: new Date().toISOString(),
      fechaModificacion: null,
      idUsuarioCreacion: null,
      idUsuarioModificacion: null,
    });
    this.router.navigate(['/home/facturacion/pagos']);
  }
}
