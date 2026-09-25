import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { provideNativeDateAdapter } from '@angular/material/core';
import { OrdenDetalle, OrdenLaboratorio } from '../../models';
import { LaboratorioService } from '../laboratorio.service';
import { CATEGORIAS_EXAMEN, ESTADOS_ORDEN, PRIORIDADES_ORDEN, TIPOS_EXAMEN } from '../laboratorio-catalogos';
import { MEDICOS } from '../../consultas-externas/consultas-catalogos';
import { PacientesService } from '../../pacientes/pacientes.service';

function toIsoDate(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseIsoDateLocal(iso: string): Date {
  const [y, m, d] = iso.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
}

@Component({
  selector: 'app-orden-formulario',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatButtonModule,
    MatIconModule,
  ],
  providers: [provideNativeDateAdapter()],
  templateUrl: './orden-formulario.html',
  styleUrl: './orden-formulario.css',
})
export class OrdenFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private laboratorioService = inject(LaboratorioService);
  private pacientesService = inject(PacientesService);

  pacientes = this.pacientesService.directorio;
  medicos = MEDICOS;
  prioridades = PRIORIDADES_ORDEN;
  estadosOrden = ESTADOS_ORDEN;
  categoriasExamen = CATEGORIAS_EXAMEN;
  todosLosExamenes = TIPOS_EXAMEN;

  idOrden = signal(0);
  esNueva = computed(() => this.idOrden() === 0);

  // Filtro de categoría que llega del menú (Electrocardiograma / Rayos X /
  // Ultrasonido son de categoría "Imagen"; Orden de laboratorio filtra a
  // categoría "Laboratorio"). null = mostrar todos los exámenes.
  filtroCategoria = signal<number | null>(null);
  examenesVisibles = computed(() => {
    const categoria = this.filtroCategoria();
    return categoria == null ? this.todosLosExamenes : this.todosLosExamenes.filter((t) => t.idCategoriaExamen === categoria);
  });

  examenesSeleccionados = signal<Set<number>>(new Set());
  seleccionInvalida = signal(false);

  // idOrdenDetalle original por tipo de examen (solo al editar), para no
  // perder su identidad si el examen sigue marcado al guardar.
  private detalleIdOriginal = new Map<number, number>();

  form = this.fb.nonNullable.group({
    idPaciente: this.fb.control<number | null>(null, Validators.required),
    idMedico: this.fb.control<number | null>(null, Validators.required),
    fecha: this.fb.control<Date | null>(new Date(), Validators.required),
    idPrioridad: this.fb.control<number | null>(1, Validators.required),
    idEstadoOrden: [1, Validators.required],
    notas: [''],
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nueva') {
      const id = Number(idParam);
      const registro = this.laboratorioService.obtener(id);
      if (registro) {
        this.cargar(registro);
      }
      return;
    }

    this.route.queryParamMap.pipe(takeUntilDestroyed()).subscribe((params) => {
      const categoriaParam = params.get('categoria');
      this.filtroCategoria.set(categoriaParam ? Number(categoriaParam) : null);

      const examenParam = params.get('examen');
      if (examenParam) {
        this.examenesSeleccionados.set(new Set([Number(examenParam)]));
      }

      const idPacienteParam = params.get('paciente');
      if (idPacienteParam) {
        this.form.patchValue({ idPaciente: Number(idPacienteParam) });
      }
    });
  }

  toggleExamen(idTipoExamen: number): void {
    this.examenesSeleccionados.update((set) => {
      const nuevo = new Set(set);
      if (nuevo.has(idTipoExamen)) {
        nuevo.delete(idTipoExamen);
      } else {
        nuevo.add(idTipoExamen);
      }
      return nuevo;
    });
    if (this.examenesSeleccionados().size > 0) {
      this.seleccionInvalida.set(false);
    }
  }

  private cargar(registro: { orden: OrdenLaboratorio; detalles: OrdenDetalle[] }): void {
    this.idOrden.set(registro.orden.idOrden);
    this.form.patchValue({
      idPaciente: registro.orden.idPaciente,
      idMedico: registro.orden.idMedico,
      fecha: parseIsoDateLocal(registro.orden.fechaOrden),
      idPrioridad: registro.orden.idPrioridad,
      idEstadoOrden: registro.orden.idEstadoOrden,
      notas: registro.orden.notas ?? '',
    });
    this.examenesSeleccionados.set(new Set(registro.detalles.map((d) => d.idTipoExamen)));
    this.detalleIdOriginal = new Map(registro.detalles.map((d) => [d.idTipoExamen, d.idOrdenDetalle]));
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.examenesSeleccionados().size === 0) {
      this.seleccionInvalida.set(true);
    }
    if (this.form.invalid || this.examenesSeleccionados().size === 0) {
      return;
    }

    const v = this.form.getRawValue();
    const idOrden = this.idOrden();

    const registro = {
      orden: {
        idOrden,
        idPaciente: v.idPaciente!,
        idMedico: v.idMedico!,
        idCita: null,
        fechaOrden: toIsoDate(v.fecha)!,
        idPrioridad: v.idPrioridad,
        idEstadoOrden: v.idEstadoOrden,
        notas: v.notas || null,
        activo: true,
        fechaCreacion: this.esNueva()
          ? new Date().toISOString()
          : (this.laboratorioService.obtener(idOrden)?.orden.fechaCreacion ?? new Date().toISOString()),
        fechaModificacion: this.esNueva() ? null : new Date().toISOString(),
        idUsuarioCreacion: null,
        idUsuarioModificacion: null,
      },
      detalles: [...this.examenesSeleccionados()].map((idTipoExamen) => ({
        idOrdenDetalle: this.detalleIdOriginal.get(idTipoExamen) ?? 0,
        idOrden,
        idTipoExamen,
        activo: true,
        fechaCreacion: new Date().toISOString(),
      })),
    };

    this.laboratorioService.guardar(registro);
    this.router.navigate(['/home/laboratorio']);
  }
}
