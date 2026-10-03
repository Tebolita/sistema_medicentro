// El comprobante de pago (foto de recibo/voucher) no tiene columna en el
// backend .NET: la relación factura↔comprobante vive solo en el nombre del
// archivo ("factura-<id>.<ext>", ver server.ts), así que acá solo queda esta
// ayuda para saber cómo mostrarlo.
export function esImagenComprobante(url: string): boolean {
  // La extensión puede no ir al final si la URL trae "?v=..." para evitar
  // que el navegador muestre una versión vieja en caché tras reemplazar el
  // archivo (mismo nombre: factura-<id>.<ext>).
  return /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(url);
}
