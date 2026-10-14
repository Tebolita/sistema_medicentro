import { computed, inject } from '@angular/core';
import { Alerta, FabricaAlertas } from './alerta.model';
import { CasosEmergenciaService } from '../emergencias/casos-emergencia.service';

// Milisegundos por hora — para calcular antigüedad de los casos.
const MS_POR_HORA = 60 * 60 * 1000;

// Umbrales de tiempo (en horas) para cada alerta.
const HORAS_ALERTA_MEDIA = 4;   // 4h sin cerrar → alerta media
const HORAS_ALERTA_ALTA = 12;   // 12h sin cerrar → alerta alta

// Umbral de volumen.
const CASOS_SIMULTANEOS_ALERTA = 15; // 15+ casos activos → alerta media

// Niveles de triage considerados críticos (los más urgentes).
const NIVEL_TRIAGE_CRITICO_MAX = 2;

// Alertas de Emergencias: casos críticos sin médico, casos que llevan
// demasiado tiempo sin cerrarse, y emergencias con volumen muy alto.
export const alertasEmergencias: FabricaAlertas = () => {
  const emergencias = inject(CasosEmergenciaService);

  const alertas = computed<Alerta[]>(() => {
    const casos = emergencias.listar();
    const ahora = Date.now();
    const resultado: Alerta[] = [];

    // 1) Casos CRÍTICOS sin médico asignado → ALTA
    const criticosSinMedico = casos.filter(
      (c) => c.idNivelTriage <= NIVEL_TRIAGE_CRITICO_MAX && c.idMedico == null,
    );
    if (criticosSinMedico.length > 0) {
      resultado.push({
        id: 'emg-criticos-sin-medico',
        titulo: `${criticosSinMedico.length} caso(s) crítico(s) sin médico asignado`,
        detalle: 'Triage 1-2 · requieren atención inmediata.',
        severidad: 'alta',
        ruta: '/home/emergencias',
      });
    }

    // 2) Otros casos sin médico (no críticos) → MEDIA
    const sinMedico = casos.filter(
      (c) => c.idMedico == null && c.idNivelTriage > NIVEL_TRIAGE_CRITICO_MAX,
    );
    if (sinMedico.length > 0) {
      resultado.push({
        id: 'emg-sin-medico',
        titulo: `${sinMedico.length} caso(s) sin médico asignado`,
        detalle: 'Asignar responsable para continuar el flujo.',
        severidad: 'media',
        ruta: '/home/emergencias',
      });
    }

    // 3) Casos con más de 12h sin cerrarse → ALTA
    const muyViejos = casos.filter((c) => {
      if (!c.horaLlegada) return false;
      const horas = (ahora - new Date(c.horaLlegada).getTime()) / MS_POR_HORA;
      return horas >= HORAS_ALERTA_ALTA;
    });
    if (muyViejos.length > 0) {
      resultado.push({
        id: 'emg-muy-viejos',
        titulo: `${muyViejos.length} caso(s) con más de ${HORAS_ALERTA_ALTA}h sin cerrar`,
        detalle: 'Revisar el flujo de atención y alta.',
        severidad: 'alta',
        ruta: '/home/emergencias',
      });
    }

    // 4) Casos con más de 4h sin cerrarse (no incluidos arriba) → MEDIA
    const viejos = casos.filter((c) => {
      if (!c.horaLlegada) return false;
      const horas = (ahora - new Date(c.horaLlegada).getTime()) / MS_POR_HORA;
      return horas >= HORAS_ALERTA_MEDIA && horas < HORAS_ALERTA_ALTA;
    });
    if (viejos.length > 0) {
      resultado.push({
        id: 'emg-viejos',
        titulo: `${viejos.length} caso(s) con más de ${HORAS_ALERTA_MEDIA}h sin cerrar`,
        detalle: 'Pueden estar esperando estudio o alta.',
        severidad: 'media',
        ruta: '/home/emergencias',
      });
    }

    // 5) Volumen alto de casos simultáneos → MEDIA
    if (casos.length >= CASOS_SIMULTANEOS_ALERTA) {
      resultado.push({
        id: 'emg-volumen-alto',
        titulo: `Emergencia con ${casos.length} casos activos`,
        detalle: 'Volumen inusualmente alto — verificar personal.',
        severidad: 'media',
        ruta: '/home/emergencias',
      });
    }

    return resultado;
  });

  return {
    alertas,
    cargar: () => {
      /* no-op */
    },
  };
};