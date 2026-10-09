import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BitacoraService, RegistroBitacora } from '../../service/bitacora.service';
import { UsuariosService } from '../../service/usuarios.service';
import { CatalogosService } from '../../service/catalogos.service';

// Mismos códigos que se acaban de sembrar en scripts/sembrar_catalogos.sql
// (TIPO_ACCION_AUDITORIA) — de respaldo mientras ese catálogo no haya
// corrido todavía contra la base.
const ACCIONES_EJEMPLO = [
  { id: 1, label: 'Crear' },
  { id: 2, label: 'Modificar' },
  { id: 3, label: 'Eliminar (baja lógica)' },
];

@Component({
  selector: 'app-bitacora-lista',
  imports: [FormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatButtonModule, DatePipe],
  templateUrl: './bitacora-lista.html',
  styleUrl: './bitacora-lista.css',
})
export class BitacoraLista {
  private bitacoraService = inject(BitacoraService);
  usuariosService = inject(UsuariosService);

  private catalogos = inject(CatalogosService);
  private accionesApi = this.catalogos.obtener('TIPO_ACCION_AUDITORIA');
  private acciones = computed(() => {
    const api = this.accionesApi();
    return api.length ? api.map((v) => ({ id: v.id, label: v.nombre })) : ACCIONES_EJEMPLO;
  });

  filtroTabla = signal('');
  filtroUsuario = signal<number | null>(null);

  registros = signal<RegistroBitacora[]>([]);
  cargando = signal(false);
  errorCarga = signal('');
  yaBusco = signal(false);

  // Fila expandida para ver el detalle (valoresAnteriores/valoresNuevos crudos).
  expandidos = signal<Set<number>>(new Set());

  constructor() {
    afterNextRender(() => {
      this.usuariosService.cargar();
      this.buscar();
    });
  }

  buscar(): void {
    this.cargando.set(true);
    this.errorCarga.set('');
    this.yaBusco.set(true);
    this.bitacoraService
      .listar({
        tablaAfectada: this.filtroTabla().trim() || undefined,
        idUsuario: this.filtroUsuario() ?? undefined,
      })
      .subscribe({
        next: (lista) => {
          this.registros.set(lista);
          this.cargando.set(false);
        },
        error: (err: Error) => {
          this.errorCarga.set(err.message);
          this.cargando.set(false);
        },
      });
  }

  limpiar(): void {
    this.filtroTabla.set('');
    this.filtroUsuario.set(null);
    this.buscar();
  }

  accionLabel(idTipoAccion: number): string {
    return this.acciones().find((a) => a.id === idTipoAccion)?.label ?? `Acción #${idTipoAccion}`;
  }

  usuarioNombre(idUsuario: number | null): string {
    if (idUsuario == null) {
      return '—';
    }
    return this.usuariosService.obtener(idUsuario)?.nombreUsuario ?? `Usuario #${idUsuario}`;
  }

  toggleDetalle(idBitacora: number): void {
    this.expandidos.update((set) => {
      const nuevo = new Set(set);
      if (nuevo.has(idBitacora)) {
        nuevo.delete(idBitacora);
      } else {
        nuevo.add(idBitacora);
      }
      return nuevo;
    });
  }
}
