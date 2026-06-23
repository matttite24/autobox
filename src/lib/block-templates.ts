export type TemplateKind = "orden" | "venta" | "etiqueta" | "ticket" | "custom";

export type BlockType =
  | "header"
  | "doc-meta"
  | "section"
  | "client"
  | "vehicle"
  | "diagnosis"
  | "items-table"
  | "payments-table"
  | "totals"
  | "billing"
  | "text"
  | "checklist"
  | "signature"
  | "vehicle-condition"
  | "separator"
  | "spacer"
  | "product-info"
  | "product-price"
  | "barcode"
  | "ticket-header"
  | "ticket-items"
  | "ticket-totals"
  | "ticket-footer";

export type HeaderConfig = {
  showOrgName: boolean;
  showFiscalName: boolean;
};

export type DocMetaConfig = {
  title: string;
  showNumber: boolean;
  showStatus: boolean;
  showCreatedAt: boolean;
  showUpdatedAt: boolean;
};

export type SectionConfig = {
  title: string;
  level: "h2" | "h3";
};

export type ClientConfig = {
  showName: boolean;
  showDocumentId: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showCompany: boolean;
};

export type VehicleConfig = {
  showMake: boolean;
  showModel: boolean;
  showYear: boolean;
  showPlate: boolean;
  showColor: boolean;
  showVin: boolean;
  showMileage: boolean;
};

export type DiagnosisConfig = {
  showSymptoms: boolean;
  showInspection: boolean;
  showNextMileage: boolean;
};

export type ItemsTableConfig = {
  title: string;
  showType: boolean;
  display: "mixed" | "grouped";
};

export type PaymentsTableConfig = {
  title: string;
};

export type TotalsConfig = {
  title: string;
  showSubtotal: boolean;
  showIva: boolean;
  showTotal: boolean;
  showPaid: boolean;
  showBalance: boolean;
  leftContent: "none" | "text" | "signature";
  leftText: string;
  signatureLabel: string;
};

export type BillingConfig = {
  title: string;
  showStatus: boolean;
  showLabel: boolean;
  showInvoiceId: boolean;
};

export type TextConfig = {
  content: string;
  align: "left" | "center" | "right";
  size: "sm" | "md" | "lg";
};

export type SpacerConfig = {
  size: "sm" | "md" | "lg";
};

// --- Etiqueta blocks ---
export type ProductInfoConfig = {
  showName: boolean;
  showSku: boolean;
  showCode: boolean;
  showLocation: boolean;
  showCategory: boolean;
  showDescription: boolean;
};

export type ProductPriceConfig = {
  label: string;
  showCost: boolean;
  size: "sm" | "md" | "lg";
};

export type BarcodeConfig = {
  showSku: boolean;
  showCode: boolean;
  style: "box" | "lines";
};

// --- Ticket térmico blocks ---
export type TicketHeaderConfig = {
  showOrgName: boolean;
  showFiscalName: boolean;
  showDocNumber: boolean;
  showDate: boolean;
  align: "left" | "center";
};

export type TicketItemsConfig = {
  showType: boolean;
  compact: boolean;
};

export type TicketTotalsConfig = {
  showSubtotal: boolean;
  showIva: boolean;
  showTotal: boolean;
  showPaid: boolean;
  showBalance: boolean;
};

export type TicketFooterConfig = {
  content: string;
  showClientName: boolean;
  showThankYou: boolean;
};

export type ChecklistConfig = {
  title: string;
  style: "check" | "bullet" | "numbered";
  items: string[];
};

export type SignatureConfig = {
  title: string;
  slots: Array<{ label: string; name: string }>;
  showDate: boolean;
};

export type VehicleConditionConfig = {
  title: string;
  showFuelLevel: boolean;
  showExteriorDamage: boolean;
  showInteriorDamage: boolean;
  showTires: boolean;
  showMileageOut: boolean;
  showObservations: boolean;
};

export type BlockConfigMap = {
  header: HeaderConfig;
  "doc-meta": DocMetaConfig;
  section: SectionConfig;
  client: ClientConfig;
  vehicle: VehicleConfig;
  diagnosis: DiagnosisConfig;
  "items-table": ItemsTableConfig;
  "payments-table": PaymentsTableConfig;
  totals: TotalsConfig;
  billing: BillingConfig;
  text: TextConfig;
  checklist: ChecklistConfig;
  signature: SignatureConfig;
  "vehicle-condition": VehicleConditionConfig;
  separator: Record<string, never>;
  spacer: SpacerConfig;
  "product-info": ProductInfoConfig;
  "product-price": ProductPriceConfig;
  barcode: BarcodeConfig;
  "ticket-header": TicketHeaderConfig;
  "ticket-items": TicketItemsConfig;
  "ticket-totals": TicketTotalsConfig;
  "ticket-footer": TicketFooterConfig;
};

export type Block<T extends BlockType = BlockType> = {
  id: string;
  type: T;
  config: BlockConfigMap[T];
};

export type AnyBlock = { [K in BlockType]: Block<K> }[BlockType];

export type BlockTemplate = {
  id: string;
  name: string;
  kind: TemplateKind;
  blocks: AnyBlock[];
};

export const BLOCK_META: Record<BlockType, { label: string; description: string; availableFor: TemplateKind[] | "all" }> = {
  header: {
    label: "Encabezado",
    description: "Nombre del negocio y razón social",
    availableFor: "all",
  },
  "doc-meta": {
    label: "Info del documento",
    description: "Número, estado, fecha y actualización",
    availableFor: "all",
  },
  section: {
    label: "Título de sección",
    description: "Encabezado H2 o H3 como separador visual",
    availableFor: "all",
  },
  client: {
    label: "Cliente",
    description: "Datos del cliente: nombre, documento, teléfono...",
    availableFor: "all",
  },
  vehicle: {
    label: "Vehículo",
    description: "Marca, modelo, placa, VIN y más",
    availableFor: ["orden"],
  },
  diagnosis: {
    label: "Diagnóstico",
    description: "Síntomas reportados e inspección",
    availableFor: ["orden"],
  },
  "items-table": {
    label: "Tabla de ítems",
    description: "Lista completa de productos y servicios",
    availableFor: "all",
  },
  "payments-table": {
    label: "Tabla de pagos",
    description: "Pagos registrados con método y referencia",
    availableFor: "all",
  },
  totals: {
    label: "Totales",
    description: "Subtotal, IVA, total, pagado y saldo",
    availableFor: "all",
  },
  billing: {
    label: "Facturación",
    description: "Estado fiscal e ID de factura",
    availableFor: "all",
  },
  text: {
    label: "Texto libre",
    description: "Párrafo personalizado con soporte de variables",
    availableFor: "all",
  },
  checklist: {
    label: "Lista de verificación",
    description: "Ítems con casillas para marcar",
    availableFor: "all",
  },
  signature: {
    label: "Firmas",
    description: "Campos de firma para actas y entregas",
    availableFor: "all",
  },
  "vehicle-condition": {
    label: "Estado del vehículo",
    description: "Condición al ingreso o egreso",
    availableFor: ["orden"],
  },
  separator: {
    label: "Separador",
    description: "Línea horizontal entre secciones",
    availableFor: "all",
  },
  spacer: {
    label: "Espacio",
    description: "Espacio en blanco vertical",
    availableFor: "all",
  },
  "product-info": {
    label: "Datos del producto",
    description: "Nombre, SKU, código y ubicación",
    availableFor: ["etiqueta"],
  },
  "product-price": {
    label: "Precio",
    description: "Precio de venta destacado",
    availableFor: ["etiqueta"],
  },
  barcode: {
    label: "Código de barras",
    description: "Representación visual del código del producto",
    availableFor: ["etiqueta"],
  },
  "ticket-header": {
    label: "Encabezado de ticket",
    description: "Nombre, número de documento y fecha en formato compacto",
    availableFor: ["ticket"],
  },
  "ticket-items": {
    label: "Ítems del ticket",
    description: "Lista de productos/servicios en formato térmico",
    availableFor: ["ticket"],
  },
  "ticket-totals": {
    label: "Totales del ticket",
    description: "Subtotal, IVA, total y pagado en formato compacto",
    availableFor: ["ticket"],
  },
  "ticket-footer": {
    label: "Pie del ticket",
    description: "Mensaje de agradecimiento y datos del cliente",
    availableFor: ["ticket"],
  },
};

export const DEFAULT_CONFIGS: BlockConfigMap = {
  header: { showOrgName: true, showFiscalName: true },
  "doc-meta": { title: "", showNumber: true, showStatus: true, showCreatedAt: true, showUpdatedAt: false },
  section: { title: "Sección", level: "h2" },
  client: { showName: true, showDocumentId: true, showPhone: true, showEmail: false, showCompany: false },
  vehicle: { showMake: true, showModel: true, showYear: true, showPlate: true, showColor: false, showVin: false, showMileage: true },
  diagnosis: { showSymptoms: true, showInspection: true, showNextMileage: true },
  "items-table": { title: "Ítems", showType: true, display: "mixed" },
  "payments-table": { title: "Pagos" },
  totals: { title: "Totales", showSubtotal: true, showIva: true, showTotal: true, showPaid: true, showBalance: true, leftContent: "none", leftText: "", signatureLabel: "Recibido conforme" },
  billing: { title: "Facturación", showStatus: true, showLabel: true, showInvoiceId: false },
  text: { content: "", align: "left", size: "md" },
  checklist: {
    title: "",
    style: "check",
    items: ["Revisión de frenos", "Nivel de aceite", "Luces", "Neumáticos", "Batería"],
  },
  signature: {
    title: "",
    slots: [
      { label: "Cliente", name: "" },
      { label: "Técnico responsable", name: "" },
    ],
    showDate: true,
  },
  "vehicle-condition": {
    title: "Estado del vehículo",
    showFuelLevel: true,
    showExteriorDamage: true,
    showInteriorDamage: true,
    showTires: true,
    showMileageOut: false,
    showObservations: true,
  },
  separator: {},
  spacer: { size: "md" },
  "product-info": { showName: true, showSku: true, showCode: true, showLocation: true, showCategory: false, showDescription: false },
  "product-price": { label: "Precio", showCost: false, size: "lg" },
  barcode: { showSku: true, showCode: true, style: "lines" },
  "ticket-header": { showOrgName: true, showFiscalName: false, showDocNumber: true, showDate: true, align: "center" },
  "ticket-items": { showType: false, compact: true },
  "ticket-totals": { showSubtotal: true, showIva: true, showTotal: true, showPaid: true, showBalance: true },
  "ticket-footer": { content: "Gracias por su compra", showClientName: true, showThankYou: true },
};

function makeId() {
  return `blk-${Math.random().toString(36).slice(2, 9)}`;
}

export function makeBlock<T extends BlockType>(type: T, override?: Partial<BlockConfigMap[T]>): Block<T> {
  return {
    id: makeId(),
    type,
    config: { ...DEFAULT_CONFIGS[type], ...override } as BlockConfigMap[T],
  };
}

// HTML generation helpers
// Dark accent color — dark gray, not pure black
const ACCENT = "#374151";

const PAD = "padding:0 20px";
const PAD_V = "padding:8px 20px";

function infoGrid(pairs: [string, string][]): string {
  const rows = pairs
    .map(
      ([label, val]) =>
        `<tr>` +
        `<td style="padding:2px 8px 2px 0;width:32%;font-size:9.5px;color:#9ca3af;white-space:nowrap;vertical-align:top;">${label}</td>` +
        `<td style="padding:2px 0;font-size:10px;color:#374151;vertical-align:top;">${val}</td>` +
        `</tr>`,
    )
    .join("");
  return (
    `<div style="padding:6px 16px;">` +
    `<table style="width:100%;border-collapse:collapse;">` +
    `<tbody>${rows}</tbody>` +
    `</table></div>`
  );
}

function blockToHtml(block: AnyBlock, kind: TemplateKind): string {
  switch (block.type) {
    case "header": {
      const cfg = block.config as HeaderConfig;
      const name = cfg.showOrgName
        ? `<div style="font-size:16px;font-weight:700;letter-spacing:-0.3px;color:#fff;">{{organization.name}}</div>`
        : "";
      const fiscal = cfg.showFiscalName
        ? `<div style="font-size:10px;color:rgba(255,255,255,0.6);margin-top:2px;">{{organization.fiscalName}}</div>`
        : "";
      return `<div style="background:${ACCENT};${PAD};padding-top:14px;padding-bottom:12px;">${name}${fiscal}</div>`;
    }

    case "doc-meta": {
      const cfg = block.config as DocMetaConfig;
      const docVar = kind === "orden" ? "order" : kind === "venta" ? "sale" : "document";
      const items: string[] = [];
      if (cfg.title) items.push(`<span style="font-weight:600;font-size:12px;">${cfg.title}</span>`);
      if (cfg.showNumber)
        items.push(
          `<span style="font-size:11px;"><span style="color:#9ca3af;">N°</span> <strong>#{{${docVar}.number}}</strong></span>`,
        );
      if (cfg.showStatus)
        items.push(
          `<span style="display:inline-block;background:#f3f4f6;border:1px solid #e5e7eb;border-radius:20px;padding:1px 8px;font-size:10px;color:#6b7280;">{{${docVar}.status}}</span>`,
        );
      if (cfg.showCreatedAt)
        items.push(`<span style="font-size:10px;color:#9ca3af;">{{${docVar}.createdAt}}</span>`);
      if (cfg.showUpdatedAt)
        items.push(
          `<span style="font-size:10px;color:#9ca3af;">Act: {{${docVar}.updatedAt}}</span>`,
        );
      return `<div style="display:flex;align-items:center;flex-wrap:wrap;gap:6px 12px;${PAD};padding-top:7px;padding-bottom:7px;background:#f9fafb;border-bottom:1px solid #e5e7eb;">${items.join("")}</div>`;
    }

    case "section": {
      const cfg = block.config as SectionConfig;
      const fs = cfg.level === "h2" ? "10px" : "9px";
      return (
        `<div style="${PAD};padding-top:14px;padding-bottom:4px;">` +
        `<div style="font-size:${fs};font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;` +
        `border-left:2px solid ${ACCENT};padding-left:6px;">${cfg.title}</div>` +
        `</div>`
      );
    }

    case "client": {
      const cfg = block.config as ClientConfig;
      const pairs: [string, string][] = [];
      if (cfg.showName) pairs.push(["Nombre", "{{client.name}}"]);
      if (cfg.showDocumentId) pairs.push(["Documento", "{{client.documentId}}"]);
      if (cfg.showPhone) pairs.push(["Teléfono", "{{client.phone}}"]);
      if (cfg.showEmail) pairs.push(["Correo", "{{client.email}}"]);
      if (cfg.showCompany) pairs.push(["Empresa", "{{client.company}}"]);
      return infoGrid(pairs);
    }

    case "vehicle": {
      const cfg = block.config as VehicleConfig;
      const pairs: [string, string][] = [];
      if (cfg.showMake) pairs.push(["Marca", "{{vehicle.make}}"]);
      if (cfg.showModel) pairs.push(["Modelo", "{{vehicle.model}}"]);
      if (cfg.showYear) pairs.push(["Año", "{{vehicle.year}}"]);
      if (cfg.showPlate) pairs.push(["Placa", "{{vehicle.plate}}"]);
      if (cfg.showColor) pairs.push(["Color", "{{vehicle.color}}"]);
      if (cfg.showVin) pairs.push(["VIN", "{{vehicle.vin}}"]);
      if (cfg.showMileage) pairs.push(["Km ingreso", "{{order.mileage}}"]);
      return infoGrid(pairs);
    }

    case "diagnosis": {
      const cfg = block.config as DiagnosisConfig;
      const pairs: [string, string][] = [];
      if (cfg.showSymptoms) pairs.push(["Síntomas", "{{order.symptoms}}"]);
      if (cfg.showInspection) pairs.push(["Inspección", "{{order.inspection}}"]);
      if (cfg.showNextMileage) pairs.push(["Próximo servicio", "{{order.nextMileage}}"]);
      return infoGrid(pairs);
    }

    case "items-table": {
      const cfg = block.config as ItemsTableConfig;
      const thBase =
        `background:${ACCENT};color:#fff;padding:5px 8px;font-size:9px;` +
        `text-transform:uppercase;letter-spacing:0.06em;font-weight:600;`;
      const colsHeader = (showType: boolean) =>
        (showType ? `<th style="${thBase}text-align:left;">Tipo</th>` : "") +
        `<th style="${thBase}text-align:left;">Descripción</th>` +
        `<th style="${thBase}text-align:right;">Cant.</th>` +
        `<th style="${thBase}text-align:right;">P. Unit.</th>` +
        `<th style="${thBase}text-align:right;">Total</th>`;
      // In grouped mode there's no type column → always 4 cols (desc, qty, unit, total)
      const subtotalRow = (varName: string) =>
        `<tr><td colspan="3" style="padding:4px 8px;font-size:10px;color:#6b7280;text-align:right;border-top:1px solid #e5e7eb;">Subtotal</td>` +
        `<td style="padding:4px 8px;font-size:11px;font-weight:700;color:${ACCENT};text-align:right;border-top:1px solid #e5e7eb;">{{totals.${varName}}}</td></tr>`;

      if (cfg.display === "grouped") {
        return (
          `<div style="${PAD};padding-top:4px;padding-bottom:10px;">{{items.groupedTable}}</div>`
        );
      }

      return (
        `<div style="${PAD};padding-top:4px;padding-bottom:10px;">` +
        `<table style="width:100%;border-collapse:collapse;font-size:11px;">` +
        `<thead><tr>${colsHeader(cfg.showType)}</tr></thead>` +
        `<tbody>{{items.table}}</tbody>` +
        `</table></div>`
      );
    }

    case "payments-table": {
      const thBase =
        `background:${ACCENT};color:#fff;padding:5px 8px;font-size:9px;` +
        `text-transform:uppercase;letter-spacing:0.06em;font-weight:600;`;
      return (
        `<div style="${PAD};padding-top:4px;padding-bottom:10px;">` +
        `<table style="width:100%;border-collapse:collapse;font-size:11px;">` +
        `<thead><tr>` +
        `<th style="${thBase}text-align:left;">Método</th>` +
        `<th style="${thBase}text-align:right;">Monto</th>` +
        `<th style="${thBase}text-align:left;">Referencia</th>` +
        `</tr></thead>` +
        `<tbody>{{payments.table}}</tbody>` +
        `</table></div>`
      );
    }

    case "totals": {
      const cfg = block.config as TotalsConfig;
      const rows: [string, string, boolean][] = [
        ["Subtotal", "{{totals.subtotal}}", cfg.showSubtotal],
        ["IVA", "{{totals.iva}}", cfg.showIva],
        ["Total", "{{totals.total}}", cfg.showTotal],
        ["Pagado", "{{totals.paid}}", cfg.showPaid],
        ["Saldo", "{{totals.balance}}", cfg.showBalance],
      ];
      const rowsHtml = rows
        .filter(([, , show]) => show)
        .map(([label, val], i, arr) => {
          const isLast = i === arr.length - 1;
          const rowStyle = isLast
            ? `border-top:1px solid ${ACCENT};background:${ACCENT};color:#fff;`
            : `border-top:1px solid #e5e7eb;`;
          const cell = `padding:5px 10px;font-size:11px;`;
          return (
            `<tr style="${rowStyle}">` +
            `<td style="${cell}font-weight:${isLast ? "700" : "400"};color:${isLast ? "#fff" : "#6b7280"};">${label}</td>` +
            `<td style="${cell}text-align:right;font-weight:${isLast ? "700" : "600"};">${val}</td>` +
            `</tr>`
          );
        })
        .join("");

      const totalsTable =
        `<table style="width:200px;margin-left:auto;border-collapse:collapse;border:1px solid #e5e7eb;overflow:hidden;">` +
        `<tbody>${rowsHtml}</tbody></table>`;

      let leftHtml = "";
      const leftContent = cfg.leftContent ?? "none";
      if (leftContent === "text" && cfg.leftText) {
        const rendered = cfg.leftText
          .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.+?)\*/g, "<em>$1</em>")
          .replace(/\n/g, "<br>");
        leftHtml =
          `<td style="vertical-align:top;padding-right:16px;">` +
          `<p style="font-size:10px;color:#6b7280;margin:0;line-height:1.6;">${rendered}</p>` +
          `</td>`;
      } else if (leftContent === "signature") {
        const label = cfg.signatureLabel || "Recibido conforme";
        leftHtml =
          `<td style="vertical-align:bottom;padding-right:16px;padding-bottom:2px;">` +
          `<div style="font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:24px;">${label}</div>` +
          `<div style="border-top:1px solid ${ACCENT};margin-bottom:5px;width:180px;"></div>` +
          `<div style="font-size:9px;color:#9ca3af;">Firma y fecha</div>` +
          `</td>`;
      }

      const inner = leftHtml
        ? `<table style="width:100%;border-collapse:collapse;"><tbody><tr>` +
          leftHtml +
          `<td style="vertical-align:top;width:200px;">${totalsTable}</td>` +
          `</tr></tbody></table>`
        : totalsTable;

      return `<div style="${PAD};padding-top:4px;padding-bottom:10px;">${inner}</div>`;
    }

    case "billing": {
      const cfg = block.config as BillingConfig;
      const pairs: [string, string][] = [];
      if (cfg.showStatus) pairs.push(["Estado fiscal", "{{facturacion.status}}"]);
      if (cfg.showLabel) pairs.push(["Etiqueta", "{{facturacion.label}}"]);
      if (cfg.showInvoiceId) pairs.push(["ID Factura", "{{facturacion.invoiceId}}"]);
      return infoGrid(pairs);
    }

    case "text": {
      const cfg = block.config as TextConfig;
      const fs = cfg.size === "sm" ? "10px" : cfg.size === "lg" ? "14px" : "11px";
      const rendered = cfg.content
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/\n/g, "<br>");
      return (
        `<div style="${PAD};padding-top:4px;padding-bottom:8px;text-align:${cfg.align ?? "left"};">` +
        `<p style="font-size:${fs};color:#4b5563;margin:0;line-height:1.6;">${rendered}</p>` +
        `</div>`
      );
    }

    case "checklist": {
      const cfg = block.config as ChecklistConfig;
      const titleHtml = cfg.title
        ? `<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;border-left:2px solid ${ACCENT};padding-left:6px;margin-bottom:6px;">${cfg.title}</div>`
        : "";
      const itemsHtml = cfg.items
        .map((item, i) => {
          const marker =
            cfg.style === "check"
              ? `<span style="display:inline-block;width:11px;height:11px;border:1px solid #9ca3af;border-radius:2px;flex-shrink:0;vertical-align:middle;margin-right:8px;"></span>`
              : cfg.style === "numbered"
              ? `<span style="font-size:10px;color:#9ca3af;margin-right:8px;min-width:16px;">${i + 1}.</span>`
              : `<span style="font-size:10px;color:#9ca3af;margin-right:8px;">•</span>`;
          return `<div style="display:flex;align-items:center;padding:3px 0;">${marker}<span style="font-size:11px;color:#374151;">${item}</span></div>`;
        })
        .join("");
      return `<div style="${PAD};padding-top:8px;padding-bottom:8px;">${titleHtml}${itemsHtml}</div>`;
    }

    case "signature": {
      const cfg = block.config as SignatureConfig;
      const titleHtml = cfg.title
        ? `<div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;border-left:2px solid ${ACCENT};padding-left:6px;margin-bottom:16px;">${cfg.title}</div>`
        : "";
      const colWidth = Math.floor(100 / cfg.slots.length);
      const cols = cfg.slots
        .map(
          ({ label, name }) =>
            `<td style="width:${colWidth}%;padding-right:20px;vertical-align:top;">` +
            `<div style="font-size:9px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:28px;">${label}</div>` +
            `<div style="border-top:1px solid ${ACCENT};margin-bottom:5px;"></div>` +
            (name ? `<div style="font-size:10px;color:#374151;font-weight:600;">${name}</div>` : `<div style="font-size:9px;color:#9ca3af;">Firma</div>`) +
            (cfg.showDate ? `<div style="margin-top:10px;font-size:9px;color:#9ca3af;">Fecha: ___/___/______</div>` : "") +
            `</td>`,
        )
        .join("");
      return (
        `<div style="${PAD};padding-top:12px;padding-bottom:16px;">` +
        titleHtml +
        `<table style="width:100%;border-collapse:collapse;"><tbody><tr>${cols}</tr></tbody></table>` +
        `</div>`
      );
    }

    case "vehicle-condition": {
      const cfg = block.config as VehicleConditionConfig;
      const box = `<span style="display:inline-block;width:10px;height:10px;border:1px solid #9ca3af;border-radius:1px;vertical-align:middle;margin-right:5px;"></span>`;
      const fuelBars = [1, 2, 3, 4].map((n) =>
        `<span style="display:inline-block;width:14px;height:8px;border:1px solid #9ca3af;margin-right:2px;border-radius:1px;"></span>`
      ).join("");

      const rows: string[] = [];
      if (cfg.showFuelLevel)
        rows.push(
          `<tr><td style="padding:4px 12px 4px 0;font-size:9px;color:#9ca3af;width:28%;white-space:nowrap;vertical-align:middle;">Combustible</td>` +
          `<td style="padding:4px 0;vertical-align:middle;">${fuelBars}</td></tr>`
        );
      if (cfg.showExteriorDamage)
        rows.push(
          `<tr><td style="padding:4px 12px 4px 0;font-size:9px;color:#9ca3af;white-space:nowrap;vertical-align:middle;">Daños exteriores</td>` +
          `<td style="padding:4px 0;font-size:10px;color:#374151;vertical-align:middle;">${box}Ninguno &nbsp; ${box}Leve &nbsp; ${box}Moderado &nbsp; ${box}Severo</td></tr>`
        );
      if (cfg.showInteriorDamage)
        rows.push(
          `<tr><td style="padding:4px 12px 4px 0;font-size:9px;color:#9ca3af;white-space:nowrap;vertical-align:middle;">Daños interiores</td>` +
          `<td style="padding:4px 0;font-size:10px;color:#374151;vertical-align:middle;">${box}Ninguno &nbsp; ${box}Leve &nbsp; ${box}Moderado</td></tr>`
        );
      if (cfg.showTires)
        rows.push(
          `<tr><td style="padding:4px 12px 4px 0;font-size:9px;color:#9ca3af;white-space:nowrap;vertical-align:middle;">Neumáticos</td>` +
          `<td style="padding:4px 0;font-size:10px;color:#374151;vertical-align:middle;">${box}OK &nbsp; ${box}Desgaste &nbsp; ${box}Reemplazar</td></tr>`
        );
      if (cfg.showMileageOut)
        rows.push(
          `<tr><td style="padding:4px 12px 4px 0;font-size:9px;color:#9ca3af;white-space:nowrap;vertical-align:middle;">Km. egreso</td>` +
          `<td style="padding:4px 0;font-size:10px;color:#374151;border-bottom:1px dotted #d1d5db;">______________</td></tr>`
        );
      if (cfg.showObservations)
        rows.push(
          `<tr><td style="padding:8px 12px 4px 0;font-size:9px;color:#9ca3af;white-space:nowrap;vertical-align:top;">Observaciones</td>` +
          `<td style="padding:8px 0;font-size:10px;border-bottom:1px dotted #d1d5db;">&nbsp;</td></tr>` +
          `<tr><td></td><td style="padding:4px 0;border-bottom:1px dotted #d1d5db;">&nbsp;</td></tr>`
        );

      return (
        `<div style="${PAD};padding-top:8px;padding-bottom:10px;">` +
        `<table style="width:100%;border-collapse:collapse;"><tbody>${rows.join("")}</tbody></table>` +
        `</div>`
      );
    }

    case "separator": {
      return `<div style="${PAD};"><hr style="border:none;border-top:1px solid #e5e7eb;margin:3px 0;" /></div>`;
    }

    case "spacer": {
      const cfg = block.config as SpacerConfig;
      const height = cfg.size === "sm" ? "6px" : cfg.size === "lg" ? "24px" : "12px";
      return `<div style="height:${height};"></div>`;
    }

    case "product-info": {
      const cfg = block.config as ProductInfoConfig;
      const rows: string[] = [];
      if (cfg.showName) rows.push(
        `<div style="font-weight:700;font-size:11px;color:#000;margin-bottom:2px;">{{product.name}}</div>`
      );
      const meta: string[] = [];
      if (cfg.showSku) meta.push(`SKU: {{product.sku}}`);
      if (cfg.showCode) meta.push(`Cód: {{product.code}}`);
      if (cfg.showLocation) meta.push(`Ubic: {{product.location}}`);
      if (cfg.showCategory) meta.push(`Cat: {{product.category}}`);
      if (meta.length) rows.push(
        `<div style="font-size:9px;color:#333;line-height:1.5;">${meta.join(" · ")}</div>`
      );
      if (cfg.showDescription) rows.push(
        `<div style="font-size:8px;color:#555;margin-top:2px;">{{product.description}}</div>`
      );
      return `<div style="padding:6px 8px;">${rows.join("")}</div>`;
    }

    case "product-price": {
      const cfg = block.config as ProductPriceConfig;
      const fs = cfg.size === "sm" ? "18px" : cfg.size === "lg" ? "30px" : "22px";
      const labelHtml = cfg.label
        ? `<div style="font-size:8px;color:#555;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:1px;">${cfg.label}</div>`
        : "";
      const costHtml = cfg.showCost
        ? `<div style="font-size:9px;color:#555;margin-top:3px;">Costo: {{product.costPrice}}</div>`
        : "";
      return (
        `<div style="padding:6px 8px;text-align:center;">` +
        labelHtml +
        `<div style="font-size:${fs};font-weight:700;color:#000;">{{product.salePrice}}</div>` +
        costHtml +
        `</div>`
      );
    }

    case "barcode": {
      const cfg = block.config as BarcodeConfig;
      const value = cfg.showSku ? "{{product.sku}}" : "{{product.code}}";
      // SVG placeholder rendered by JsBarcode at print time via data-barcode attribute
      return (
        `<div style="padding:4px 8px;text-align:center;">` +
        `<svg class="jbarcode" data-value="${value}" data-format="CODE128" ` +
        `style="display:block;margin:0 auto;max-width:100%;"></svg>` +
        `<div style="font-size:8px;color:#000;margin-top:2px;letter-spacing:0.04em;">${value}</div>` +
        `</div>`
      );
    }

    case "ticket-header": {
      const cfg = block.config as TicketHeaderConfig;
      const align = cfg.align ?? "center";
      const name = cfg.showOrgName
        ? `<div style="font-size:13px;font-weight:700;color:#000;">{{organization.name}}</div>`
        : "";
      const fiscal = cfg.showFiscalName
        ? `<div style="font-size:9px;color:#333;margin-top:1px;">{{organization.fiscalName}}</div>`
        : "";
      const docNum = cfg.showDocNumber
        ? `<div style="font-size:10px;color:#000;margin-top:4px;"><strong>N° {{document.number}}</strong></div>`
        : "";
      const date = cfg.showDate
        ? `<div style="font-size:9px;color:#333;margin-top:2px;">{{document.createdAt}}</div>`
        : "";
      return (
        `<div style="text-align:${align};padding:8px 4px 6px;border-bottom:1px dashed #000;">` +
        name + fiscal + docNum + date +
        `</div>`
      );
    }

    case "ticket-items": {
      const cfg = block.config as TicketItemsConfig;
      const lineHt = cfg.compact ? "1.3" : "1.6";
      return (
        `<div style="padding:5px 2px;font-size:10px;line-height:${lineHt};color:#000;">` +
        `<div style="display:flex;justify-content:space-between;font-size:8px;color:#555;` +
        `border-bottom:1px solid #000;padding-bottom:2px;margin-bottom:4px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">` +
        (cfg.showType ? `<span style="width:14%">Tipo</span>` : "") +
        `<span style="flex:1">Descripción</span>` +
        `<span style="width:12%;text-align:right;">Cant</span>` +
        `<span style="width:20%;text-align:right;">Total</span>` +
        `</div>` +
        `{{ticket.itemsRows}}` +
        `</div>`
      );
    }

    case "ticket-totals": {
      const cfg = block.config as TicketTotalsConfig;
      const row = (label: string, val: string, bold = false) =>
        `<div style="display:flex;justify-content:space-between;padding:2px 0;` +
        `font-size:${bold ? "11" : "10"}px;font-weight:${bold ? "700" : "400"};color:#000;` +
        `${bold ? "border-top:1px solid #000;padding-top:4px;margin-top:4px;" : ""}">` +
        `<span>${label}</span><span>${val}</span></div>`;
      const rows: string[] = [];
      if (cfg.showSubtotal) rows.push(row("Subtotal", "{{totals.subtotal}}"));
      if (cfg.showIva) rows.push(row("IVA", "{{totals.iva}}"));
      if (cfg.showTotal) rows.push(row("TOTAL", "{{totals.total}}", true));
      if (cfg.showPaid) rows.push(row("Pagado", "{{totals.paid}}"));
      if (cfg.showBalance) rows.push(row("Saldo", "{{totals.balance}}"));
      return `<div style="padding:4px 2px;border-top:1px dashed #000;color:#000;">${rows.join("")}</div>`;
    }

    case "ticket-footer": {
      const cfg = block.config as TicketFooterConfig;
      const client = cfg.showClientName
        ? `<div style="font-size:9px;color:#333;margin-bottom:3px;">Cliente: {{client.name}}</div>`
        : "";
      const msg = cfg.showThankYou && cfg.content
        ? `<div style="font-size:10px;font-weight:600;color:#000;margin-top:4px;">${cfg.content}</div>`
        : "";
      return (
        `<div style="text-align:center;padding:6px 2px 8px;border-top:1px dashed #000;color:#000;">` +
        client + msg +
        `</div>`
      );
    }

    default:
      return "";
  }
}

export function generateHtmlFromBlocks(blocks: AnyBlock[], kind: TemplateKind): string {
  const parts: string[] = [];
  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i];
    const next = blocks[i + 1];
    // Render client + vehicle side by side when they appear consecutively
    if (block.type === "client" && next?.type === "vehicle") {
      const left = blockToHtml(block, kind);
      const right = blockToHtml(next, kind);
      parts.push(
        `<table style="width:100%;border-collapse:collapse;"><tbody><tr>` +
        `<td style="width:50%;vertical-align:top;border-right:1px solid #e5e7eb;">${left}</td>` +
        `<td style="width:50%;vertical-align:top;">${right}</td>` +
        `</tr></tbody></table>`,
      );
      i += 2;
      continue;
    }
    const html = blockToHtml(block, kind);
    if (html) parts.push(html);
    i++;
  }
  return `<div class="doc-template" style="font-family:system-ui,sans-serif;color:#18181b;font-size:13px;">\n${parts.join("\n")}\n</div>`;
}

// Shared CSS applied both in the preview iframe and in the print page.
// Keep this in sync with imprimir/page.tsx styles.
export const DOC_SHARED_CSS = `
  * { box-sizing: border-box; }
  .doc-shell {
    max-width: 210mm;
    margin: 0 auto;
    background: white;
    box-shadow: 0 8px 30px rgba(0,0,0,0.08);
    border-radius: 2px;
    overflow: hidden;
  }
  .doc-template { overflow: hidden; }
`;

// Default block templates

export function defaultOrderBlocks(): AnyBlock[] {
  return [
    makeBlock("header"),
    makeBlock("separator"),
    makeBlock("doc-meta", { showNumber: true, showStatus: true, showCreatedAt: true, showUpdatedAt: true }),
    makeBlock("separator"),
    makeBlock("section", { title: "Cliente y vehículo", level: "h2" }),
    makeBlock("client", { showName: true, showDocumentId: true, showPhone: true, showEmail: true, showCompany: false }),
    makeBlock("vehicle", { showMake: true, showModel: true, showYear: true, showPlate: true, showColor: true, showVin: true, showMileage: true }),
    makeBlock("section", { title: "Diagnóstico", level: "h2" }),
    makeBlock("diagnosis"),
    makeBlock("section", { title: "Ítems", level: "h2" }),
    makeBlock("items-table"),
    makeBlock("section", { title: "Pagos", level: "h2" }),
    makeBlock("payments-table"),
    makeBlock("section", { title: "Totales", level: "h2" }),
    makeBlock("totals"),
    makeBlock("section", { title: "Facturación", level: "h2" }),
    makeBlock("billing"),
  ];
}

export function defaultSaleBlocks(): AnyBlock[] {
  return [
    makeBlock("header"),
    makeBlock("separator"),
    makeBlock("doc-meta", { showNumber: true, showStatus: true, showCreatedAt: true, showUpdatedAt: true }),
    makeBlock("separator"),
    makeBlock("section", { title: "Cliente", level: "h2" }),
    makeBlock("client", { showName: true, showDocumentId: true, showPhone: true, showEmail: true, showCompany: true }),
    makeBlock("section", { title: "Ítems", level: "h2" }),
    makeBlock("items-table"),
    makeBlock("section", { title: "Pagos", level: "h2" }),
    makeBlock("payments-table"),
    makeBlock("section", { title: "Totales", level: "h2" }),
    makeBlock("totals"),
    makeBlock("section", { title: "Facturación", level: "h2" }),
    makeBlock("billing"),
  ];
}

export function defaultLabelBlocks(): AnyBlock[] {
  return [
    makeBlock("header"),
    makeBlock("separator"),
    makeBlock("product-info", { showName: true, showSku: true, showCode: true, showLocation: true, showCategory: false, showDescription: false }),
    makeBlock("separator"),
    makeBlock("product-price", { label: "Precio", showCost: false, size: "lg" }),
    makeBlock("barcode", { showSku: true, showCode: false, style: "lines" }),
  ];
}

export function defaultTicketBlocks(): AnyBlock[] {
  return [
    makeBlock("ticket-header", { showOrgName: true, showFiscalName: false, showDocNumber: true, showDate: true, align: "center" }),
    makeBlock("ticket-items", { showType: false, compact: true }),
    makeBlock("ticket-totals", { showSubtotal: true, showIva: true, showTotal: true, showPaid: true, showBalance: true }),
    makeBlock("ticket-footer", { content: "Gracias por su compra", showClientName: true, showThankYou: true }),
  ];
}

export function defaultBlockTemplates(): BlockTemplate[] {
  return [
    { id: "default-order", name: "Orden por defecto", kind: "orden", blocks: defaultOrderBlocks() },
    { id: "default-sale", name: "Venta por defecto", kind: "venta", blocks: defaultSaleBlocks() },
    { id: "default-label", name: "Etiqueta de producto", kind: "etiqueta", blocks: defaultLabelBlocks() },
    { id: "default-ticket", name: "Ticket térmico", kind: "ticket", blocks: defaultTicketBlocks() },
  ];
}

// CSS para impresión de ticket térmico (80mm) — solo B&N
export const TICKET_PRINT_CSS = [
  "@page { size: 80mm auto; margin: 3mm 4mm; }",
  "* { box-sizing: border-box; }",
  "body { margin: 0; font-family: 'Courier New', Courier, monospace; font-size: 10px; color: #000; background: #fff; }",
  "* { color: #000 !important; background: transparent !important; border-color: #000 !important; }",
  "svg.jbarcode { display: block; margin: 0 auto; }",
].join("\n");

// CSS para impresión de etiquetas — solo B&N
export const LABEL_PRINT_CSS = [
  "@page { size: 62mm 29mm; margin: 1mm; }",
  "* { box-sizing: border-box; color: #000 !important; background: transparent !important; }",
  "body { margin: 0; font-family: system-ui, sans-serif; background: #fff; }",
  "svg.jbarcode { display: block; margin: 0 auto; }",
].join("\n");

// Script que activa JsBarcode en los SVGs con class="jbarcode" después de renderizar
export const JSBARCODE_INIT_SCRIPT = `
<script>
(function() {
  function tryInit(retries) {
    if (typeof JsBarcode === 'undefined') {
      if (retries > 0) setTimeout(function() { tryInit(retries - 1); }, 100);
      return;
    }
    document.querySelectorAll('svg.jbarcode').forEach(function(el) {
      var val = el.getAttribute('data-value');
      if (!val || val.trim() === '') return;
      try {
        JsBarcode(el, val, {
          format: el.getAttribute('data-format') || 'CODE128',
          displayValue: false,
          margin: 2,
          width: 1.2,
          height: 30,
          background: '#ffffff',
          lineColor: '#000000',
        });
      } catch(e) {}
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { tryInit(5); });
  } else {
    tryInit(5);
  }
})();
</script>`;
