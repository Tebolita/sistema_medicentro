import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RecetaDetalle } from '../../models';
import { RecetaCompleta, RecetaInput, RecetasService } from '../../service/recetas.service';
import { MedicamentosService } from '../../service/medicamentos.service';
import { ESTADOS_RECETA } from '../farmacia-catalogos';
import { MEDICOS } from '../../consultas-externas/consultas-catalogos';
import { PacientesService } from '../../pacientes/pacientes.service';

@Component({
  selector: 'app-receta-formulario',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  templateUrl: './receta-formulario.html',
  styleUrl: './receta-formulario.css',
})
export class RecetaFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private recetasService = inject(RecetasService);
  private pacientesService = inject(PacientesService);

  pacientes = this.pacientesService.directorio;
  medicos = MEDICOS;
  private medicamentosService = inject(MedicamentosService);
  medicamentos = this.medicamentosService.listar;
  estadosReceta = ESTADOS_RECETA;

  idReceta = signal(0);
  esNueva = computed(() => this.idReceta() === 0);

  cabecera = this.fb.nonNullable.group({
    idPaciente: this.fb.control<number | null>(null, Validators.required),
    idMedico: this.fb.control<number | null>(null, Validators.required),
    idEstadoReceta: [1, Validators.required],
  });

  detalles = this.fb.array<ReturnType<typeof this.crearDetalleGroup>>([]);

  guardando = signal(false);
  errorMsg = signal('');
  private fechaEmisionOriginal: string | null = null;

  constructor() {
    afterNextRender(() => this.medicamentosService.cargar());
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nueva') {
      // Edición: se trae la receta del backend (sirve también al recargar la página).
      this.recetasService.obtener(Number(idParam)).subscribe({
        next: (registro) => this.cargar(registro),
        error: (err: Error) => this.errorMsg.set(err.message),
      });
      return;
    }
    this.agregarDetalle();
  }

  private crearDetalleGroup(d?: RecetaDetalle) {
    return this.fb.nonNullable.group({
      id: d?.idRecetaDetalle ?? 0,
      idMedicamento: this.fb.control<number | null>(d?.idMedicamento ?? null, Validators.required),
      dosis: [d?.dosis ?? '', Validators.required],
      frecuencia: [d?.frecuencia ?? '', Validators.required],
      duracion: [d?.duracion ?? ''],
      indicaciones: [d?.indicaciones ?? ''],
    });
  }

  agregarDetalle(): void {
    this.detalles.push(this.crearDetalleGroup());
  }

  quitarDetalle(index: number): void {
    this.detalles.removeAt(index);
  }

  private cargar(registro: RecetaCompleta): void {
    this.idReceta.set(registro.receta.idReceta);
    this.fechaEmisionOriginal = registro.receta.fechaEmision;
    this.cabecera.patchValue({
      idPaciente: registro.receta.idPaciente,
      idMedico: registro.receta.idMedico,
      idEstadoReceta: registro.receta.idEstadoReceta,
    });
    registro.detalles.forEach((d) => this.detalles.push(this.crearDetalleGroup(d)));
  }

  guardar(): void {
    this.cabecera.markAllAsTouched();
    this.detalles.markAllAsTouched();
    if (this.cabecera.invalid || this.detalles.invalid || this.detalles.length === 0) {
      return;
    }

    const cab = this.cabecera.getRawValue();
    const idReceta = this.idReceta();

    const receta: RecetaInput = {
      idTratamiento: null,
      idPaciente: cab.idPaciente!,
      idMedico: cab.idMedico!,
      fechaEmision: this.fechaEmisionOriginal ?? new Date().toISOString(),
      firmaDigitalHash: null,
      firmaDigitalUrl: null,
      idEstadoReceta: cab.idEstadoReceta,
      // idRecetaDetalle 0 = línea nueva; el backend da de baja las que no vengan.
      detalles: this.detalles.getRawValue().map((d) => ({
        idRecetaDetalle: d.id,
        idMedicamento: d.idMedicamento!,
        dosis: d.dosis,
        frecuencia: d.frecuencia,
        duracion: d.duracion || null,
        indicaciones: d.indicaciones || null,
      })),
    };

    this.guardando.set(true);
    this.errorMsg.set('');
    const peticion = this.esNueva()
      ? this.recetasService.crear(receta)
      : this.recetasService.actualizar(idReceta, receta);
    peticion.subscribe({
      next: () => this.router.navigate(['/home/farmacia/recetas']),
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
      },
    });
  }
}
