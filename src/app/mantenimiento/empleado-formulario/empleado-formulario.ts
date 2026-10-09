import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Empleado, EmpleadoInput, EmpleadosService } from '../../service/empleados.service';
import { PuestosService } from '../../service/puestos.service';
import { EspecialidadesService } from '../../service/especialidades.service';
import { CatalogosService } from '../../service/catalogos.service';
import { GENEROS, TIPOS_DOCUMENTO, ESTADOS_EMPLEADO } from '../empleados-catalogos';
import { AuditoriaInfo } from '../../shared/auditoria-info/auditoria-info';

@Component({
  selector: 'app-empleado-formulario',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    AuditoriaInfo,
  ],
  templateUrl: './empleado-formulario.html',
  styleUrl: './empleado-formulario.css',
})
export class EmpleadoFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private empleadosService = inject(EmpleadosService);

  puestosService = inject(PuestosService);
  puestos = this.puestosService.listar;
  especialidadesService = inject(EspecialidadesService);
  especialidades = this.especialidadesService.listar;

  // Igual que en otros formularios: valores reales del catálogo si existen
  // en la base, si no, la lista de ejemplo.
  private catalogos = inject(CatalogosService);
  private generosApi = this.catalogos.obtener('GENERO');
  generos = computed(() => {
    const api = this.generosApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : GENEROS;
  });
  private tiposDocumentoApi = this.catalogos.obtener('TIPO_DOCUMENTO');
  tiposDocumento = computed(() => {
    const api = this.tiposDocumentoApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : TIPOS_DOCUMENTO;
  });
  private estadosApi = this.catalogos.obtener('ESTADO_EMPLEADO');
  estados = computed(() => {
    const api = this.estadosApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : ESTADOS_EMPLEADO;
  });

  idEmpleado = signal(0);
  esNuevo = computed(() => this.idEmpleado() === 0);
  guardando = signal(false);
  errorMsg = signal('');
  registro = signal<Empleado | null>(null);

  form = this.fb.nonNullable.group({
    primerNombre: ['', Validators.required],
    segundoNombre: [''],
    primerApellido: ['', Validators.required],
    segundoApellido: [''],
    fechaNacimiento: [''], // input type="date" (yyyy-MM-dd)
    idGenero: this.fb.control<number | null>(null),
    idTipoDocumento: this.fb.control<number | null>(null),
    numeroDocumento: [''],
    idPuesto: this.fb.control<number | null>(null, Validators.required),
    idEspecialidad: this.fb.control<number | null>(null),
    colegiado: [''],
    fechaIngreso: ['', Validators.required],
    fechaEgreso: [''],
    idEstadoEmpleado: this.fb.control<number | null>(null, Validators.required),
    telefono: [''],
    correo: ['', Validators.email],
    direccion: [''],
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      // Edición: se trae del backend (sirve también al recargar la página).
      this.empleadosService.obtenerPorId(Number(idParam)).subscribe({
        next: (e) => this.cargar(e),
        error: (err: Error) => this.errorMsg.set(err.message),
      });
    }
  }

  private cargar(e: Empleado): void {
    this.idEmpleado.set(e.idEmpleado);
    this.registro.set(e);
    this.form.patchValue({
      primerNombre: e.primerNombre,
      segundoNombre: e.segundoNombre ?? '',
      primerApellido: e.primerApellido,
      segundoApellido: e.segundoApellido ?? '',
      fechaNacimiento: e.fechaNacimiento?.slice(0, 10) ?? '',
      idGenero: e.idGenero,
      idTipoDocumento: e.idTipoDocumento,
      numeroDocumento: e.numeroDocumento ?? '',
      idPuesto: e.idPuesto,
      idEspecialidad: e.idEspecialidad,
      colegiado: e.colegiado ?? '',
      fechaIngreso: e.fechaIngreso.slice(0, 10),
      fechaEgreso: e.fechaEgreso?.slice(0, 10) ?? '',
      idEstadoEmpleado: e.idEstadoEmpleado,
      telefono: e.telefono ?? '',
      correo: e.correo ?? '',
      direccion: e.direccion ?? '',
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const input: EmpleadoInput = {
      primerNombre: v.primerNombre.trim(),
      segundoNombre: v.segundoNombre.trim() || null,
      primerApellido: v.primerApellido.trim(),
      segundoApellido: v.segundoApellido.trim() || null,
      fechaNacimiento: v.fechaNacimiento || null,
      idGenero: v.idGenero,
      idTipoDocumento: v.idTipoDocumento,
      numeroDocumento: v.numeroDocumento.trim() || null,
      idPuesto: v.idPuesto!,
      idEspecialidad: v.idEspecialidad,
      colegiado: v.colegiado.trim() || null,
      fechaIngreso: v.fechaIngreso,
      fechaEgreso: v.fechaEgreso || null,
      idEstadoEmpleado: v.idEstadoEmpleado!,
      telefono: v.telefono.trim() || null,
      correo: v.correo.trim() || null,
      direccion: v.direccion.trim() || null,
    };

    this.guardando.set(true);
    this.errorMsg.set('');
    const peticion = this.esNuevo()
      ? this.empleadosService.crear(input)
      : this.empleadosService.actualizar(this.idEmpleado(), input);
    peticion.subscribe({
      next: () => this.router.navigate(['/home/mantenimiento/empleados']),
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
      },
    });
  }
}
