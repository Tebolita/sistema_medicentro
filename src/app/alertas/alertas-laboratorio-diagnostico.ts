import { computed, inject } from '@angular/core';
import { Alerta, FabricaAlertas } from './alerta.model';
import { LaboratorioService } from '../service/laboratorio.service';

// Milisegundos en un día — para calcular antigüedad de las órdenes.
const MS_POR_DIA = 24 * 60 * 60 * 1000;

// Umbrales (en días) para disparar cada alerta.
const DIAS_ALERTA_MEDIA = 1;   // 24 horas sin procesar → alerta media
const DIAS_ALERTA_ALTA = 3;    // 3 días sin procesar  → alerta alta
const CANTIDAD_PENDIENTES_ALERTA = 10; // muchas órdenes pendientes

// Alertas de Laboratorio y Diagnóstico: órdenes que llevan demasiado tiempo
// sin procesarse, o un volumen muy alto de pendientes.
export const alertasLaboratorioDiagnostico: FabricaAlertas = () => {
  const lab = inject(LaboratorioService);

  const alertas = computed<Alerta[]>(() => {
    const ordenes = lab.listar();
    const ahora = Date.now();
    const resultado: Alerta[] = [];

    // 1) Órdenes con más de 3 días sin procesar → severidad ALTA
    const muyViejas = ordenes.filter((r) => {
      if (!r.orden.fechaOrden) return false;
      const dias = (ahora - new Date(r.orden.fechaOrden).getTime()) / MS_POR_DIA;
      return dias >= DIAS_ALERTA_ALTA;
    });

    if (muyViejas.length > 0) {
      resultado.push({
        id: 'lab-muy-viejas',
        titulo: `${muyViejas.length} orden(es) con más de ${DIAS_ALERTA_ALTA} días sin procesar`,
        detalle: 'Revisar el flujo de laboratorio — pueden estar trabadas.',
        severidad: 'alta',
        ruta: '/home/laboratorio',
      });
    }

    // 2) Órdenes con más de 1 día sin procesar → severidad MEDIA
    //    (excluimos las que ya entraron en la alerta anterior)
    const viejas = ordenes.filter((r) => {
      if (!r.orden.fechaOrden) return false;
      const dias = (ahora - new Date(r.orden.fechaOrden).getTime()) / MS_POR_DIA;
      return dias >= DIAS_ALERTA_MEDIA && dias < DIAS_ALERTA_ALTA;
    });

    if (viejas.length > 0) {
      resultado.push({
        id: 'lab-viejas',
        titulo: `${viejas.length} orden(es) con más de 24 horas sin procesar`,
        detalle: 'Pendientes de tomar o de cargar resultado.',
        severidad: 'media',
        ruta: '/home/laboratorio',
      });
    }

    // 3) Muchas órdenes pendientes en total → severidad INFO
    if (ordenes.length >= CANTIDAD_PENDIENTES_ALERTA) {
      resultado.push({
        id: 'lab-volumen-alto',
        titulo: `Volumen alto: ${ordenes.length} órdenes activas`,
        detalle: 'Revisar la carga de trabajo del día.',
        severidad: 'info',
        ruta: '/home/laboratorio',
      });
    }

    return resultado;
  });

  return {
    alertas,
    // El servicio carga las órdenes en su constructor (para navegador), pero
    // exponemos un cargar() no-op por compatibilidad con el contrato de
    // FabricaAlertas. Si en el futuro el servicio expone un método público
    // de recarga, lo llamamos desde acá.
    cargar: () => {
      /* no-op por ahora */
    },
  };
};