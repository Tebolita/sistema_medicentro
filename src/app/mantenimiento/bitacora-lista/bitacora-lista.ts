import { Component, afterNextRender, computed, inject, signal } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
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

// Campos que vienen en TODOS los registros (valoresAnteriores/valoresNuevos
// los manda MedicentroDbContext.SerializarValores con el nombre de
// propiedad de C#, ver backend) pero no aportan nada para entender QUÉ
// cambió — se ocultan del detalle en vez de llenarlo de ruido.
const CAMPOS_IGNORADOS = new Set([
  'FechaCreacion',
  'FechaModificacion',
  'IdUsuarioCreacion',
  'IdUsuarioModificacion',
]);

export type TipoCambioCampo = 'nuevo' | 'cambio' | 'quitado';

export interface CambioCampo {
  campo: string;
  tipo: TipoCambioCampo;
  antes: string | null;
  despues: string | null;
}

@Component({
  selector: 'app-bitacora-lista',
  imports: [FormsModule, RouterLink, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, MatButtonModule, DatePipe, NgClass],
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

  // Mismo lenguaje visual que el modal "Historial general" de Laboratorio/
  // Emergencias/Hospitalización (badges tipo pill por acción) — acá se
  // deriva del texto de la etiqueta en vez de un id fijo porque la bitácora
  // cubre acciones de TODOS los módulos, no solo las 3 de un catálogo local.
  accionClase(idTipoAccion: number): string {
    const label = this.accionLabel(idTipoAccion).toLowerCase();
    if (label.includes('crear')) return 'accion-crear';
    if (label.includes('modific') || label.includes('actualiz')) return 'accion-modificar';
    if (label.includes('eliminar')) return 'accion-eliminar';
    return 'accion-default';
  }

  accionIcono(idTipoAccion: number): string {
    const label = this.accionLabel(idTipoAccion).toLowerCase();
    if (label.includes('crear')) return 'add_circle';
    if (label.includes('modific') || label.includes('actualiz')) return 'edit';
    if (label.includes('eliminar')) return 'delete';
    return 'history';
  }

  // Nombres de tabla "humanizados": snake_case -> palabras separadas,
  // primera letra mayúscula (p. ej. "ordenes_laboratorio" -> "Ordenes
  // laboratorio"). Sin diccionario fijo por tabla como en los módulos
  // individuales, porque acá puede aparecer cualquier tabla del sistema.
  tablaLabel(tabla: string): string {
    const texto = tabla.replace(/_/g, ' ');
    return texto.charAt(0).toUpperCase() + texto.slice(1);
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

  // Convierte el par de JSON crudos (valoresAnteriores/valoresNuevos) en una
  // lista de "qué campo cambió, de qué a qué" — en vez de mostrar el JSON
  // tal cual, que nadie fuera de un desarrollador puede leer rápido.
  camposCambiados(r: RegistroBitacora): CambioCampo[] {
    const antes = this.parsear(r.valoresAnteriores);
    const despues = this.parsear(r.valoresNuevos);
    const campos = new Set([...Object.keys(antes ?? {}), ...Object.keys(despues ?? {})]);

    const cambios: CambioCampo[] = [];
    for (const campo of campos) {
      if (CAMPOS_IGNORADOS.has(campo)) {
        continue;
      }
      const tieneAntes = !!antes && campo in antes;
      const tieneDespues = !!despues && campo in despues;
      const valorAntes = tieneAntes ? antes![campo] : undefined;
      const valorDespues = tieneDespues ? despues![campo] : undefined;

      if (tieneAntes && tieneDespues && JSON.stringify(valorAntes) === JSON.stringify(valorDespues)) {
        continue; // sin cambios en este campo — no aporta nada mostrarlo
      }

      let tipo: TipoCambioCampo = 'cambio';
      if (!tieneAntes) tipo = 'nuevo';
      else if (!tieneDespues) tipo = 'quitado';

      cambios.push({
        campo: this.humanizarCampo(campo),
        tipo,
        antes: tieneAntes ? this.formatearValor(valorAntes) : null,
        despues: tieneDespues ? this.formatearValor(valorDespues) : null,
      });
    }
    return cambios;
  }

  iconoDeCambio(tipo: TipoCambioCampo): string {
    return tipo === 'nuevo' ? 'add_circle' : tipo === 'quitado' ? 'remove_circle' : 'sync_alt';
  }

  private parsear(json: string | null): Record<string, unknown> | null {
    if (!json) {
      return null;
    }
    try {
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  private humanizarCampo(campo: string): string {
    return campo.replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  }

  private formatearValor(valor: unknown): string {
    if (valor === null || valor === undefined || valor === '') {
      return '(vacío)';
    }
    if (typeof valor === 'boolean') {
      return valor ? 'Sí' : 'No';
    }
    if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(valor)) {
      const fecha = new Date(valor);
      return isNaN(fecha.getTime()) ? valor : fecha.toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    return String(valor);
  }
}
