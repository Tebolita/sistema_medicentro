// Entorno de producción (build con configuración "production", la que usa
// `ng build` por default). Antes la URL de la API estaba repetida y fija en
// 48 archivos de servicio — ahora vive en un solo lugar.
//
// IMPORTANTE: antes de desplegar a un servidor real, cambia apiUrl a la URL
// real del backend en ese ambiente (no va a ser "localhost" fuera de una
// máquina de desarrollo).
export const environment = {
  production: true,
  apiUrl: 'https://localhost:7086',
};
