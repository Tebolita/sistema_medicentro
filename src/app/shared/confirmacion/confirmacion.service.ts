import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ConfirmacionDialog, ConfirmacionData } from './confirmacion-dialog';

export interface ConfirmacionOpciones {
  titulo?: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  peligroso?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ConfirmacionService {
  private dialog = inject(MatDialog);

  confirmar(mensaje: string, opciones?: ConfirmacionOpciones): Promise<boolean> {
    const data: ConfirmacionData = {
      mensaje,
      titulo: opciones?.titulo ?? 'Confirmar acción',
      textoConfirmar: opciones?.textoConfirmar ?? 'Confirmar',
      textoCancelar: opciones?.textoCancelar ?? 'Cancelar',
      peligroso: opciones?.peligroso ?? false,
    };

    const ref = this.dialog.open(ConfirmacionDialog, {
      data,
      autoFocus: false,
      restoreFocus: true,
    });

    return firstValueFrom(ref.afterClosed()).then((resultado) => resultado === true);
  }
}
