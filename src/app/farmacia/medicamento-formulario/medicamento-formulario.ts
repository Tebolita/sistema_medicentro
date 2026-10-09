import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { Medicamento } from '../../models';
import { MedicamentoInput, MedicamentosService } from '../../service/medicamentos.service';
import { CatalogosService } from '../../service/catalogos.service';
import { UsuariosService } from '../../service/usuarios.service';

@Component({
  selector: 'app-medicamento-formulario',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
  ],
  templateUrl: './medicamento-formulario.html',
  styleUrl: './medicamento-formulario.css',
})
export class MedicamentoFormulario {
  private fb = inject(FormBuilder);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private medicamentosService = inject(MedicamentosService);
  private usuariosService = inject(UsuariosService);

  idMedicamento = signal(0);
  esNuevo = computed(() => this.idMedicamento() === 0);
  guardando = signal(false);
  errorMsg = signal('');
  registro = signal<Medicamento | undefined>(undefined);

  // El backend valida que el id exista en cat_valor_catalogo (cualquier
  // catálogo, no uno en particular), pero por convención debería ser del
  // tipo CATEGORIA_MEDICAMENTO. Si ese catálogo no está sembrado en la
  // base, se cae a un campo numérico para no bloquear el formulario.
  private catalogos = inject(CatalogosService);
  private categoriasApi = this.catalogos.obtener('CATEGORIA_MEDICAMENTO');
  categorias = computed(() => this.categoriasApi());
  hayCategorias = computed(() => this.categorias().length > 0);

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    principioActivo: [''],
    presentacion: [''],
    concentracion: [''],
    requiereReceta: [false],
    idCategoriaMedicamento: this.fb.control<number | null>(null),
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      // Edición: se trae del backend (sirve también al recargar la página).
      this.medicamentosService.obtenerPorId(Number(idParam)).subscribe({
        next: (m) => this.cargar(m),
        error: (err: Error) => this.errorMsg.set(err.message),
      });
    }
  }

  private cargar(m: Medicamento): void {
    this.idMedicamento.set(m.idMedicamento);
    this.registro.set(m);
    this.form.patchValue({
      nombre: m.nombre,
      principioActivo: m.principioActivo ?? '',
      presentacion: m.presentacion ?? '',
      concentracion: m.concentracion ?? '',
      requiereReceta: m.requiereReceta,
      idCategoriaMedicamento: m.idCategoriaMedicamento,
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const input: MedicamentoInput = {
      nombre: v.nombre.trim(),
      principioActivo: v.principioActivo.trim() || null,
      presentacion: v.presentacion.trim() || null,
      concentracion: v.concentracion.trim() || null,
      idCategoriaMedicamento: v.idCategoriaMedicamento,
      requiereReceta: v.requiereReceta,
    };

    this.guardando.set(true);
    this.errorMsg.set('');
    const peticion = this.esNuevo()
      ? this.medicamentosService.crear(input)
      : this.medicamentosService.actualizar(this.idMedicamento(), input);
    peticion.subscribe({
      next: () => this.router.navigate(['/home/farmacia/medicamentos']),
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
      },
    });
  }

  // Igual que en la lista: el backend tiene el campo pero todavía no lo
  // llena (ver SOLICITUD_ENDPOINTS_ELIMINADOS.md punto 5), así que esto
  // muestra "—" hasta que eso se arregle del lado del backend.
  usuarioLabel(id: number | null): string {
    if (!id) {
      return '—';
    }
    return this.usuariosService.obtener(id)?.nombreUsuario ?? `Usuario #${id}`;
  }
}
