// El archivo del comprobante de pago (foto de recibo/voucher) se sube y
// guarda en el servidor Node de esta app (ver server.ts), no en el backend
// .NET; esta ayuda solo decide cómo mostrarlo según su extensión.
export function esImagenComprobante(url: string): boolean {
  // La extensión puede no ir al final si la URL trae "?v=..." para evitar
  // que el navegador muestre una versión vieja en caché tras reemplazar el
  // archivo (mismo nombre: factura-<id>.<ext>).
  return /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(url);
}
