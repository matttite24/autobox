export type TemplateRecord = {
  id: string;
  name: string;
  kind: "orden" | "cotizacion" | "venta" | "etiqueta" | "ticket" | "custom";
  format: "html";
  content: string;
  updatedAt: number;
};

const DEFAULT_ORDER_TEMPLATE = `
<div class="doc-template">
  <div class="doc-header">
    <h1>{{organization.name}}</h1>
    <p>{{organization.fiscalName}}</p>
  </div>
  <hr />
  <div class="doc-meta">
    <div><strong>Orden:</strong> #{{order.number}}</div>
    <div><strong>Estado:</strong> {{order.status}}</div>
    <div><strong>Fecha:</strong> {{order.createdAt}}</div>
    <div><strong>Actualizada:</strong> {{order.updatedAt}}</div>
  </div>
  <hr />
  <h2>Cliente y vehículo</h2>
  <table>
    <tbody>
      <tr><th>Cliente</th><td>{{client.name}}</td></tr>
      <tr><th>Documento</th><td>{{client.documentId}}</td></tr>
      <tr><th>Teléfono</th><td>{{client.phone}}</td></tr>
      <tr><th>Correo</th><td>{{client.email}}</td></tr>
      <tr><th>Vehículo</th><td>{{vehicle.make}} {{vehicle.model}}</td></tr>
      <tr><th>Placa</th><td>{{vehicle.plate}}</td></tr>
      <tr><th>Año</th><td>{{vehicle.year}}</td></tr>
      <tr><th>Color</th><td>{{vehicle.color}}</td></tr>
      <tr><th>VIN</th><td>{{vehicle.vin}}</td></tr>
      <tr><th>Kilometraje</th><td>{{order.mileage}}</td></tr>
    </tbody>
  </table>
  <h2>Diagnóstico</h2>
  <table>
    <tbody>
      <tr><th>Síntomas</th><td>{{order.symptoms}}</td></tr>
      <tr><th>Inspección</th><td>{{order.inspection}}</td></tr>
      <tr><th>Próximo servicio</th><td>{{order.nextMileage}}</td></tr>
    </tbody>
  </table>
  <h2>Ítems</h2>
  <table>
    <thead>
      <tr><th>Tipo</th><th>Descripción</th><th class="num">Cant.</th><th class="num">P. Unit.</th><th class="num">Total</th></tr>
    </thead>
    <tbody>{{items.table}}</tbody>
  </table>
  <h2>Pagos</h2>
  <table>
    <thead>
      <tr><th>Método</th><th class="num">Monto</th><th>Referencia</th></tr>
    </thead>
    <tbody>{{payments.table}}</tbody>
  </table>
  <h2>Totales</h2>
  <table>
    <tbody>
      <tr><th>Subtotal</th><td class="num">{{totals.subtotal}}</td></tr>
      <tr><th>IVA</th><td class="num">{{totals.iva}}</td></tr>
      <tr><th>Total</th><td class="num">{{totals.total}}</td></tr>
      <tr><th>Pagado</th><td class="num">{{totals.paid}}</td></tr>
      <tr><th>Saldo</th><td class="num">{{totals.balance}}</td></tr>
    </tbody>
  </table>
  <h2>Facturación</h2>
  <table>
    <tbody>
      <tr><th>Estado</th><td>{{facturacion.status}}</td></tr>
      <tr><th>Etiqueta</th><td>{{facturacion.label}}</td></tr>
    </tbody>
  </table>
</div>`.trim();

const DEFAULT_SALE_TEMPLATE = `
<div class="doc-template">
  <div class="doc-header">
    <h1>{{organization.name}}</h1>
    <p>{{organization.fiscalName}}</p>
  </div>
  <hr />
  <div class="doc-meta">
    <div><strong>Venta:</strong> #{{sale.number}}</div>
    <div><strong>Estado:</strong> {{sale.status}}</div>
    <div><strong>Fecha:</strong> {{sale.createdAt}}</div>
    <div><strong>Actualizada:</strong> {{sale.updatedAt}}</div>
  </div>
  <hr />
  <h2>Cliente</h2>
  <table>
    <tbody>
      <tr><th>Nombre</th><td>{{client.name}}</td></tr>
      <tr><th>Documento</th><td>{{client.documentId}}</td></tr>
      <tr><th>Teléfono</th><td>{{client.phone}}</td></tr>
      <tr><th>Correo</th><td>{{client.email}}</td></tr>
      <tr><th>Empresa</th><td>{{client.company}}</td></tr>
    </tbody>
  </table>
  <h2>Ítems</h2>
  <table>
    <thead>
      <tr><th>Tipo</th><th>Descripción</th><th class="num">Cant.</th><th class="num">P. Unit.</th><th class="num">Total</th></tr>
    </thead>
    <tbody>{{items.table}}</tbody>
  </table>
  <h2>Pagos</h2>
  <table>
    <thead>
      <tr><th>Método</th><th class="num">Monto</th><th>Referencia</th></tr>
    </thead>
    <tbody>{{payments.table}}</tbody>
  </table>
  <h2>Totales</h2>
  <table>
    <tbody>
      <tr><th>Subtotal</th><td class="num">{{totals.subtotal}}</td></tr>
      <tr><th>IVA</th><td class="num">{{totals.iva}}</td></tr>
      <tr><th>Total</th><td class="num">{{totals.total}}</td></tr>
      <tr><th>Pagado</th><td class="num">{{totals.paid}}</td></tr>
      <tr><th>Saldo</th><td class="num">{{totals.balance}}</td></tr>
    </tbody>
  </table>
  <h2>Facturación</h2>
  <table>
    <tbody>
      <tr><th>Estado</th><td>{{facturacion.status}}</td></tr>
      <tr><th>Etiqueta</th><td>{{facturacion.label}}</td></tr>
    </tbody>
  </table>
</div>`.trim();

export function defaultTemplates(): TemplateRecord[] {
  return [
    { id: "default-order", name: "Orden por defecto", kind: "orden", format: "html", content: DEFAULT_ORDER_TEMPLATE, updatedAt: Date.now() },
    { id: "default-sale", name: "Venta por defecto", kind: "venta", format: "html", content: DEFAULT_SALE_TEMPLATE, updatedAt: Date.now() },
  ];
}

export function normalizeTemplates(templates: TemplateRecord[] | undefined | null): TemplateRecord[] {
  const current = (templates ?? []).filter((tpl) => tpl.format === "html" && tpl.content.trim());
  const defaults = defaultTemplates();
  const byId = new Map(current.map((tpl) => [tpl.id, tpl]));
  return defaults.map((tpl) => byId.get(tpl.id) ?? tpl).concat(current.filter((tpl) => !defaults.some((d) => d.id === tpl.id)));
}

type TemplateContext = Record<string, unknown>;

function lookupPath(context: TemplateContext, path: string): string {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, context);

  if (value === null || value === undefined) return "";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "string") return value;
  return "";
}

function interpolate(text: string, context: TemplateContext) {
  return text.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_, path: string) => lookupPath(context, path.trim()));
}

export function renderTemplateContent(template: TemplateRecord, context: TemplateContext = {}): string {
  return interpolate(template.content, context);
}

export function sourceKindToTitle(kind: "orden" | "venta" | "compra") {
  if (kind === "orden") return "Orden de trabajo";
  if (kind === "venta") return "Venta";
  return "Compra";
}
