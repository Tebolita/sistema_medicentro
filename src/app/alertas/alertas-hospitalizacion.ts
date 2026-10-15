import { computed, inject } from '@angular/core';
import { Alerta, FabricaAlertas } from './alerta.model';
import { HospitalizacionesService } from '../service/hospitalizaciones.service';

// Milisegundos por día — para calcular antigüedad de las hospitalizaciones.
const MS_POR_DIA = 24 * 60 * 60 * 1000;

// Umbrales (en días) para disparar cada alerta.
const DIAS_ALERTA_MEDIA = 7;    // 7 días internado → alerta media
const DIAS_ALERTA_ALTA = 14;    // 14 días internado → alerta alta

// Umbral de volumen.
const PACIENTES_SIMULTANEOS_ALERTA = 20;

// Alertas de Hospitalización: pacientes sin médico, internaciones muy
// prolongadas, pacientes sin órdenes médicas registradas, y volumen alto.
export const alertasHospitalizacion: FabricaAlertas = () => {
  const hospitalizaciones = inject(HospitalizacionesService);

  const alertas = computed<Alerta[]>(() => {
    // ✅ Usamos `listar()` + filtro por `fechaEgreso == null`
    //    para NO depender del catálogo ESTADO_HOSPITALIZACION (que puede
    //    no estar cargado al entrar al módulo).
    const activas = hospitalizaciones
      .listar()
      .filter((r) => !r.hospitalizacion.fechaEgreso);

    const ahora = Date.now();
    const resultado: Alerta[] = [];

    // 1) Hospitalizaciones sin médico responsable → ALTA
    const sinMedico = activas.filter(
      (r) => r.hospitalizacion.idMedicoResponsable == null,
    );
    if (sinMedico.length > 0) {
      resultado.push({
        id: 'hosp-sin-medico',
        titulo: `${sinMedico.length} paciente(s) sin médico responsable`,
        detalle: 'Asignar un responsable para el seguimiento.',
        severidad: 'alta',
        ruta: '/home/hospitalizacion',
      });
    }

    // 2) Hospitalizaciones con más de 14 días → ALTA
    const muyLargas = activas.filter((r) => {
      if (!r.hospitalizacion.fechaIngreso) return false;
      const dias =
        (ahora - new Date(r.hospitalizacion.fechaIngreso).getTime()) / MS_POR_DIA;
      return dias >= DIAS_ALERTA_ALTA;
    });
    if (muyLargas.length > 0) {
      resultado.push({
        id: 'hosp-muy-largas',
        titulo: `${muyLargas.length} hospitalización(es) con más de ${DIAS_ALERTA_ALTA} días`,
        detalle: 'Revisar plan de alta y evolución.',
        severidad: 'alta',
        ruta: '/home/hospitalizacion',
      });
    }

    // 3) Hospitalizaciones entre 7 y 13 días → MEDIA
    const largas = activas.filter((r) => {
      if (!r.hospitalizacion.fechaIngreso) return false;
      const dias =
        (ahora - new Date(r.hospitalizacion.fechaIngreso).getTime()) / MS_POR_DIA;
      return dias >= DIAS_ALERTA_MEDIA && dias < DIAS_ALERTA_ALTA;
    });
    if (largas.length > 0) {
      resultado.push({
        id: 'hosp-largas',
        titulo: `${largas.length} hospitalización(es) con más de ${DIAS_ALERTA_MEDIA} días`,
        detalle: 'Seguimiento prolongado — verificar evolución.',
        severidad: 'media',
        ruta: '/home/hospitalizacion',
      });
    }

    // 4) Pacientes sin órdenes médicas registradas → MEDIA
    const sinOrdenes = activas.filter((r) => r.ordenes.length === 0);
    if (sinOrdenes.length > 0) {
      resultado.push({
        id: 'hosp-sin-ordenes',
        titulo: `${sinOrdenes.length} paciente(s) sin órdenes médicas`,
        detalle: 'Verificar si el tratamiento fue registrado.',
        severidad: 'media',
        ruta: '/home/hospitalizacion',
      });
    }

    // 5) Volumen alto → MEDIA
    if (activas.length >= PACIENTES_SIMULTANEOS_ALERTA) {
      resultado.push({
        id: 'hosp-volumen-alto',
        titulo: `Volumen alto: ${activas.length} pacientes internados`,
        detalle: 'Verificar disponibilidad de camas y personal.',
        severidad: 'media',
        ruta: '/home/hospitalizacion',
      });
    }

    return resultado;
  });

  return {
    alertas,
    cargar: () => {
      // ✅ Precargamos los catálogos para que `listar()` y demás consultas
      //    del servicio funcionen bien desde el primer render.
      hospitalizaciones.precargarCatalogosCamas();
    },
  };
};