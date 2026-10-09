import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { CatalogosService } from '../../service/catalogos.service';
import { TIPOS_CATALOGO_CONOCIDOS, TipoCatalogoConocido } from '../mantenimiento-catalogos';
import { TipoCatalogoDialog } from '../tipo-catalogo-dialog/tipo-catalogo-dialog';
import { ValorCatalogoDialog } from '../valor-catalogo-dialog/valor-catalogo-dialog';

@Component({
  selector: 'app-catalogos-lista',
  imports: [RouterLink, MatIconModule, MatButtonModule, MatTooltipModule, MatDialogModule],
  templateUrl: './catalogos-lista.html',
  styleUrl: './catalogos-lista.css',
})
export class CatalogosLista {
  private catalogosService = inject(CatalogosService);
  private dialog = inject(MatDialog);

  // El backend ya tiene GET /api/catalogos (lista TODOS los que existen en
  // la base, con sus valores). Esa es la fuente de verdad; la lista curada
  // de este archivo solo aporta un ícono más específico para los que ya
  // conocemos, cuando el código coincide. Si el backend no respondiera por
  // algún motivo, se cae a la lista curada para no dejar la pantalla vacía.
  tiposConocidos = computed<TipoCatalogoConocido[]>(() => {
    const delBackend = this.catalogosService.tiposDesdeBackend();
    if (!delBackend.length) {
      return TIPOS_CATALOGO_CONOCIDOS;
    }
    return delBackend.map((t) => {
      const curado = TIPOS_CATALOGO_CONOCIDOS.find((c) => c.codigo === t.codigo);
      return { codigo: t.codigo, nombre: t.nombre, grupo: curado?.grupo ?? 'general', icono: curado?.icono ?? 'tune' };
    });
  });
  errorAccion = signal('');

  // Buscador global: filtra las tarjetas de catálogo por nombre o código.
  buscar = signal('');

  catalogosFiltrados = computed(() => {
    const todos = this.tiposConocidos();
    const term = this.buscar().trim().toLowerCase();
    return term
      ? todos.filter((t) => t.nombre.toLowerCase().includes(term) || t.codigo.toLowerCase().includes(term))
      : todos;
  });

  // Color de fondo del ícono de cada tarjeta: no viene de datos (ya no
  // importa el módulo), se genera a partir del código del catálogo —
  // "aleatorio" pero estable, para que no cambie de color en cada render.
  // Saturación e iluminación fijas y moderadas para que no se vea chillón.
  colorDe(codigo: string): string {
    let hash = 0;
    for (let i = 0; i < codigo.length; i++) {
      hash = (hash * 31 + codigo.charCodeAt(i)) % 360;
    }
    return `hsl(${hash}, 45%, 45%)`;
  }

  tipoSeleccionado = signal<string | null>(null);

  valores = computed(() => {
    const codigo = this.tipoSeleccionado();
    return codigo ? this.catalogosService.obtener(codigo)() : [];
  });

  catalogoActual = computed<TipoCatalogoConocido | null>(() => {
    const codigo = this.tipoSeleccionado();
    if (!codigo) {
      return null;
    }
    return this.tiposConocidos().find((t) => t.codigo === codigo) ?? { codigo, nombre: codigo, grupo: '', icono: 'tune' };
  });

  seleccionarTipo(codigo: string): void {
    this.tipoSeleccionado.set(codigo);
  }

  volverACatalogos(): void {
    this.tipoSeleccionado.set(null);
  }

  abrirNuevoCatalogo(): void {
    this.dialog
      .open(TipoCatalogoDialog, { autoFocus: false })
      .afterClosed()
      .subscribe((creado: boolean) => {
        if (creado) {
          // El popup ya hizo que el servicio recargara la lista completa;
          // solo falta limpiar el buscador para que la tarjeta nueva se
          // vea de inmediato.
          this.buscar.set('');
        }
      });
  }

  nuevoValor(): void {
    const codigoTipo = this.tipoSeleccionado();
    if (!codigoTipo) {
      return;
    }
    this.dialog.open(ValorCatalogoDialog, {
      autoFocus: false,
      data: {
        codigoTipo,
        nombreTipo: this.catalogoActual()?.nombre ?? codigoTipo,
        siguienteOrden: this.valores().length + 1,
      },
    });
  }

  editarValor(idValor: number): void {
    const codigoTipo = this.tipoSeleccionado();
    const valor = this.valores().find((v) => v.id === idValor);
    if (!codigoTipo || !valor) {
      return;
    }
    this.dialog.open(ValorCatalogoDialog, {
      autoFocus: false,
      data: {
        codigoTipo,
        nombreTipo: this.catalogoActual()?.nombre ?? codigoTipo,
        valor,
        siguienteOrden: valor.orden,
      },
    });
  }

  eliminarValor(idValor: number, nombre: string): void {
    const codigoTipo = this.tipoSeleccionado();
    if (!codigoTipo) {
      return;
    }
    // El backend no tiene forma de reactivar un valor dado de baja (el GET
    // solo trae los activos): aviso explícito de que no es reversible acá.
    if (!confirm(`¿Dar de baja el valor "${nombre}"? No se puede deshacer desde esta pantalla.`)) {
      return;
    }
    this.errorAccion.set('');
    this.catalogosService.eliminarValor(codigoTipo, idValor).subscribe({
      error: (err: Error) => this.errorAccion.set(err.message),
    });
  }
}
