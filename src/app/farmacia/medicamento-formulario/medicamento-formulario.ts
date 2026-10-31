import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { Medicamento } from '../../models';
import { BitacoraItem, MedicamentoInput, MedicamentosService } from '../../service/medicamentos.service';
import { CatalogosService } from '../../service/catalogos.service';
import { UsuariosService } from '../../service/usuarios.service';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';

@Component({
  selector: 'app-medicamento-formulario',
  imports: [
    NgClass,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatSelectModule,
  ],
  templateUrl: './medicamento-formulario.html',
  styleUrl: './medicamento-formulario.css',
})
export class MedicamentoFormulario {
  private fb = inject(FormBuilder);
  private accionAuditoria = inject(AuditoriaAccionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private medicamentosService = inject(MedicamentosService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);

  idMedicamento = signal(0);
  esNuevo = computed(() => this.idMedicamento() === 0);
  guardando = signal(false);
  errorMsg = signal('');
  registro = signal<Medicamento | undefined>(undefined);

  historialAbierto = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);
  cargandoHistorial = signal(false);

  // El backend valida que el id exista en cat_valor_catalogo (cualquier
  // catálogo, no uno en particular), pero por convención debería ser del
  // tipo CATEGORIA_MEDICAMENTO. Si ese catálogo no está sembrado en la
  // base, se cae a un campo numérico para no bloquear el formulario.
  private catalogos = inject(CatalogosService);
  private categoriasApi = this.catalogos.obtener('CATEGORIA_MEDICAMENTO');
  categorias = computed(() => this.categoriasApi());
  hayCategorias = computed(() => this.categorias().length > 0);

  // Farmacia (se vende/factura al paciente) vs Clínica (uso interno, se
  // administra a hospitalizados) vs Ambos — solo informativo.
  private destinosApi = this.catalogos.obtener('DESTINO_MEDICAMENTO');
  destinos = computed(() => this.destinosApi());
  hayDestinos = computed(() => this.destinos().length > 0);

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    principioActivo: [''],
    presentacion: [''],
    concentracion: [''],
    requiereReceta: [false],
    idCategoriaMedicamento: this.fb.control<number | null>(null),
    idDestinoMedicamento: this.fb.control<number | null>(null),
    precioVentaPublico: this.fb.nonNullable.control<number>(0, [Validators.required, Validators.min(0)]),
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
      idDestinoMedicamento: m.idDestinoMedicamento,
      precioVentaPublico: m.precioVentaPublico,
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
      idDestinoMedicamento: v.idDestinoMedicamento,
      requiereReceta: v.requiereReceta,
      precioVentaPublico: v.precioVentaPublico,
    };

    this.guardando.set(true);
    this.errorMsg.set('');
    const peticion = this.esNuevo()
      ? this.medicamentosService.crear(input)
      : this.medicamentosService.actualizar(this.idMedicamento(), input);
    peticion.subscribe({
      next: () => {
        this.notificaciones.exito(this.esNuevo() ? 'Creado correctamente' : 'Actualizado correctamente');
        this.router.navigate(['/home/farmacia/medicamentos']);
      },
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

  // ============================================================
  // HISTORIAL DE AUDITORÍA
  // ============================================================

  abrirHistorial(): void {
    const id = this.idMedicamento();
    if (id === 0) return;

    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.medicamentosService.RetornarBitacoraPorRegistro('medicamentos', id).subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items);
        this.cargandoHistorial.set(false);
      },
      error: (err: HttpErrorResponse) => {
        console.error('❌ Error al cargar bitácora:', err.status);
        this.cargandoHistorial.set(false);
        this.notificaciones.error('No se pudo cargar la bitácora');
      },
    });
  }

  cerrarHistorial(): void {
    this.historialAbierto.set(false);
    this.bitacoraSignal.set([]);
  }

  accionLabel(idTipoAccion: number): string {
    return this.accionAuditoria.label(idTipoAccion);
  }

  accionClase(idTipoAccion: number): string {
    return this.accionAuditoria.clase(idTipoAccion);
  }

  accionIcono(idTipoAccion: number): string {
    return this.accionAuditoria.icono(idTipoAccion);
  }

  formatFechaHora(iso: string): string {
    if (!iso) return '—';
    const isoConZona = iso.endsWith('Z') ? iso : iso + 'Z';
    const fecha = new Date(isoConZona);
    if (isNaN(fecha.getTime())) return '—';
    return fecha.toLocaleString('es-GT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  camposCambiados(item: BitacoraItem): Array<{ campo: string; antes: string; despues: string }> {
    try {
      const antes = item.valoresAnteriores ? JSON.parse(item.valoresAnteriores) : {};
      const despues = item.valoresNuevos ? JSON.parse(item.valoresNuevos) : {};

      const camposIgnorados = new Set([
        'IdUsuarioModificacion',
        'FechaModificacion',
        'IdUsuarioCreacion',
      ]);

      const idRegistroReal = this.idMedicamento();

      const cambios: Array<{ campo: string; antes: string; despues: string }> = [];
      const claves = new Set([...Object.keys(antes), ...Object.keys(despues)]);

      for (const k of claves) {
        if (camposIgnorados.has(k)) continue;

        let a = antes[k];
        let d = despues[k];

        if (k === 'IdMedicamento' && idRegistroReal != null) {
          a = idRegistroReal;
          d = idRegistroReal;
        }

        if (JSON.stringify(a) === JSON.stringify(d)) continue;

        cambios.push({
          campo: this.formatearNombreCampo(k),
          antes: this.formatearValor(a, k),
          despues: this.formatearValor(d, k),
        });
      }

      cambios.sort((x, y) => {
        if (x.campo.toLowerCase().includes('id medicamento')) return -1;
        if (y.campo.toLowerCase().includes('id medicamento')) return 1;
        return x.campo.localeCompare(y.campo);
      });

      return cambios;
    } catch {
      return [];
    }
  }

  private formatearNombreCampo(campo: string): string {
    return campo
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (c) => c.toUpperCase())
      .trim();
  }

  private formatearValor(valor: any, nombreCampo: string = ''): string {
    if (valor === null || valor === undefined) return '—';

    if (this.esCampoFecha(nombreCampo) && typeof valor === 'string') {
      const fecha = new Date(valor);
      if (!isNaN(fecha.getTime())) {
        return fecha.toLocaleString('es-GT', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }

    if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
    if (typeof valor === 'object') return JSON.stringify(valor);
    return String(valor);
  }

  private esCampoFecha(nombreCampo: string): boolean {
    return /fecha|fechahora|creacion|modificacion/i.test(nombreCampo);
  }
}
