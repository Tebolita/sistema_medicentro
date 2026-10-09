import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Proveedor, ProveedorInput, ProveedoresService } from '../../service/proveedores.service';
import { AuditoriaInfo } from '../../shared/auditoria-info/auditoria-info';

@Component({
  selector: 'app-proveedor-formulario',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    AuditoriaInfo,
  ],
  templateUrl: './proveedor-formulario.html',
  styleUrl: './proveedor-formulario.css',
})
export class ProveedorFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private proveedoresService = inject(ProveedoresService);

  idProveedor = signal(0);
  esNuevo = computed(() => this.idProveedor() === 0);
  guardando = signal(false);
  errorMsg = signal('');
  registro = signal<Proveedor | null>(null);

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    nit: [''],
    telefono: [''],
    // Mismo validador que el backend ([EmailAddress]), para avisar antes de enviar.
    correo: ['', Validators.email],
    direccion: [''],
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      // Edición: se trae del backend (sirve también al recargar la página).
      this.proveedoresService.obtenerPorId(Number(idParam)).subscribe({
        next: (p) => this.cargar(p),
        error: (err: Error) => this.errorMsg.set(err.message),
      });
    }
  }

  private cargar(p: Proveedor): void {
    this.idProveedor.set(p.idProveedor);
    this.registro.set(p);
    this.form.patchValue({
      nombre: p.nombre,
      nit: p.nit ?? '',
      telefono: p.telefono ?? '',
      correo: p.correo ?? '',
      direccion: p.direccion ?? '',
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const input: ProveedorInput = {
      nombre: v.nombre.trim(),
      nit: v.nit.trim() || null,
      telefono: v.telefono.trim() || null,
      correo: v.correo.trim() || null,
      direccion: v.direccion.trim() || null,
    };

    this.guardando.set(true);
    this.errorMsg.set('');
    const peticion = this.esNuevo()
      ? this.proveedoresService.crear(input)
      : this.proveedoresService.actualizar(this.idProveedor(), input);
    peticion.subscribe({
      next: () => this.router.navigate(['/home/mantenimiento/proveedores']),
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
      },
    });
  }
}
