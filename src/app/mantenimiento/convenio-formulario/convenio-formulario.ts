import { AuditoriaAccionService } from '../../shared/auditoria-accion.service';
import { Component, computed, inject, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BitacoraItem, Convenio, ConvenioInput, ConveniosService } from '../../service/convenios.service';
import { AseguradorasService } from '../../service/aseguradoras.service';
import { CatalogosService } from '../../service/catalogos.service';
import { UsuariosService } from '../../service/usuarios.service';
import { AuditoriaInfo } from '../../shared/auditoria-info/auditoria-info';
import { NotificacionesService } from '../../shared/notificaciones/notificaciones.service';

@Component({
  selector: 'app-convenio-formulario',
  imports: [
    NgClass,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    AuditoriaInfo,
  ],
  templateUrl: './convenio-formulario.html',
  styleUrl: './convenio-formulario.css',
})
export class ConvenioFormulario {
  private fb = inject(FormBuilder);
  private accionAuditoria = inject(AuditoriaAccionService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private conveniosService = inject(ConveniosService);
  private aseguradorasService = inject(AseguradorasService);
  private usuariosService = inject(UsuariosService);
  private notificaciones = inject(NotificacionesService);

  // ============================================================
  // HISTORIAL DE AUDITORÍA
  // ============================================================
  historialAbierto = signal(false);
  bitacoraSignal = signal<BitacoraItem[]>([]);
  cargandoHistorial = signal(false);

  aseguradoras = this.aseguradorasService.listar;

  // ESTADO_CONVENIO: se sembró junto con el resto de catálogos
  // (scripts/sembrar_catalogos.sql). Si no existe todavía, se cae a una
  // lista de ejemplo para no bloquear el formulario.
  private catalogos = inject(CatalogosService);
  private estadosApi = this.catalogos.obtener('ESTADO_CONVENIO');
  estados = computed(() => {
    const api = this.estadosApi();
    return api.length
      ? api.map((v) => ({ id: v.id, label: v.nombre }))
      : [
          { id: 1, label: 'Vigente' },
          { id: 2, label: 'Vencido' },
          { id: 3, label: 'Suspendido' },
        ];
  });

  idConvenio = signal(0);
  esNuevo = computed(() => this.idConvenio() === 0);
  guardando = signal(false);
  errorMsg = signal('');
  registro = signal<Convenio | null>(null);

  form = this.fb.nonNullable.group({
    idAseguradora: this.fb.control<number | null>(null, Validators.required),
    nombreConvenio: ['', Validators.required],
    fechaInicio: ['', Validators.required], // input type="date" (yyyy-MM-dd)
    fechaFin: [''],
    porcentajeCoberturaGeneral: this.fb.control<number | null>(null, [Validators.min(0), Validators.max(100)]),
    idEstadoConvenio: this.fb.control<number | null>(null, Validators.required),
    condiciones: [''],
  });

  constructor() {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam && idParam !== 'nuevo') {
      // Edición: se trae del backend (sirve también al recargar la página).
      this.conveniosService.obtenerPorId(Number(idParam)).subscribe({
        next: (c) => this.cargar(c),
        error: (err: Error) => this.errorMsg.set(err.message),
      });
    }
  }

  private cargar(c: Convenio): void {
    this.idConvenio.set(c.idConvenio);
    this.registro.set(c);
    this.form.patchValue({
      idAseguradora: c.idAseguradora,
      nombreConvenio: c.nombreConvenio,
      fechaInicio: c.fechaInicio?.slice(0, 10) ?? '',
      fechaFin: c.fechaFin?.slice(0, 10) ?? '',
      porcentajeCoberturaGeneral: c.porcentajeCoberturaGeneral,
      idEstadoConvenio: c.idEstadoConvenio,
      condiciones: c.condiciones ?? '',
    });
  }

  guardar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }
    const v = this.form.getRawValue();
    const input: ConvenioInput = {
      idAseguradora: v.idAseguradora!,
      nombreConvenio: v.nombreConvenio.trim(),
      fechaInicio: v.fechaInicio,
      fechaFin: v.fechaFin || null,
      porcentajeCoberturaGeneral: v.porcentajeCoberturaGeneral,
      idEstadoConvenio: v.idEstadoConvenio!,
      condiciones: v.condiciones.trim() || null,
    };

    this.guardando.set(true);
    this.errorMsg.set('');
    const peticion = this.esNuevo()
      ? this.conveniosService.crear(input)
      : this.conveniosService.actualizar(this.idConvenio(), input);
    peticion.subscribe({
      next: () => {
        this.notificaciones.exito(this.esNuevo() ? 'Creado correctamente' : 'Actualizado correctamente');
        this.router.navigate(['/home/mantenimiento/convenios']);
      },
      error: (err: Error) => {
        this.errorMsg.set(err.message);
        this.guardando.set(false);
      },
    });
  }

  // ============================================================
  // HISTORIAL DE AUDITORÍA
  // ============================================================

  abrirHistorial(): void {
    const id = this.idConvenio();
    if (id === 0) return;

    this.historialAbierto.set(true);
    this.cargandoHistorial.set(true);
    this.bitacoraSignal.set([]);

    this.conveniosService.RetornarBitacoraPorRegistro('convenios', id).subscribe({
      next: (items) => {
        this.bitacoraSignal.set(items.filter((b) => this.camposCambiados(b).length > 0));
        this.cargandoHistorial.set(false);
      },
      error: (err: Error) => {
        console.error('❌ Error al cargar bitácora:', err);
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

  usuarioLabel(idUsuario: number | null): string {
    if (idUsuario == null) return 'Sistema';
    return this.usuariosService.obtener(idUsuario)?.nombreUsuario ?? `Usuario #${idUsuario}`;
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

      const idRegistroReal = this.idConvenio();

      const cambios: Array<{ campo: string; antes: string; despues: string }> = [];
      const claves = new Set([...Object.keys(antes), ...Object.keys(despues)]);

      for (const k of claves) {
        if (camposIgnorados.has(k)) continue;

        let a = antes[k];
        let d = despues[k];

        if (k === 'IdConvenio' && idRegistroReal != null) {
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
        if (x.campo.toLowerCase().includes('id convenio')) return -1;
        if (y.campo.toLowerCase().includes('id convenio')) return 1;
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
