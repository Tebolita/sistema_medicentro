import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Sala, SalaInput, SalasService } from '../../service/salas.service';
import { CatalogosService } from '../../service/catalogos.service';
import { UsuariosService } from '../../service/usuarios.service';
import { TIPOS_SALA, ESTADOS_SALA } from '../salas-catalogos';

@Component({
  selector: 'app-sala-formulario',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './sala-formulario.html',
  styleUrl: './sala-formulario.css',
})
export class SalaFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private salasService = inject(SalasService);
  private usuariosService = inject(UsuariosService);

  private catalogos = inject(CatalogosService);
  private tiposApi = this.catalogos.obtener('TIPO_SALA');
  tipos = computed(() => {
    const api = this.tiposApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : TIPOS_SALA;
  });
  private estadosApi = this.catalogos.obtener('ESTADO_SALA');
  estados = computed(() => {
    const api = this.estadosApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : ESTADOS_SALA;
  });

  idSala = signal(0);
  esNueva = computed(() => this.idSala() === 0);
  guardando = signal(false);
  errorMsg = signal('');
  registro = signal<Sala | undefined>(undefined);

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    idTipoSala: this.fb.control<number | null>(null),
    idEstadoSala: this.fb.control<number | null>(null, Validators.required),
    capacidad: [1, [Validators.required, Validators.min(1)]],
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nueva') {
      // Edición: se trae del backend (sirve también al recargar la página).
      this.salasService.obtenerPorId(Number(idParam)).subscribe({
        next: (s) => this.cargar(s),
        error: (err: Error) => this.errorMsg.set(err.message),
      });
    }
  }

  private cargar(s: Sala): void {
    this.idSala.set(s.idSala);
    this.registro.set(s);
    this.form.patchValue({
      nombre: s.nombre,
      idTipoSala: s.idTipoSala,
      idEstadoSala: s.idEstadoSala,
      capacidad: s.capacidad,
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const input: SalaInput = {
      nombre: v.nombre.trim(),
      idTipoSala: v.idTipoSala,
      idEstadoSala: v.idEstadoSala!,
      capacidad: v.capacidad,
    };

    this.guardando.set(true);
    this.errorMsg.set('');
    const peticion = this.esNueva()
      ? this.salasService.crear(input)
      : this.salasService.actualizar(this.idSala(), input);
    peticion.subscribe({
      next: () => this.router.navigate(['/home/mantenimiento/salas']),
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
      },
    });
  }

  usuarioLabel(id: number | null): string {
    if (!id) {
      return '—';
    }
    return this.usuariosService.obtener(id)?.nombreUsuario ?? `Usuario #${id}`;
  }
}
