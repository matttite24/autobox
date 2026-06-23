# Plantilla HTML para ODT

```html
<div class="doc-template">
  <style>
    .doc-template {
      font-family: Arial, sans-serif;
      color: #111827;
      font-size: 12px;
      line-height: 1.45;
    }

    .doc-template h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .doc-template h2 {
      margin: 18px 0 8px;
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .doc-template p {
      margin: 0;
    }

    .doc-template hr {
      border: 0;
      border-top: 1px solid #d4d4d8;
      margin: 12px 0;
    }

    .doc-template .header {
      display: flex;
      justify-content: space-between;
      gap: 24px;
      align-items: flex-start;
    }

    .doc-template .header .brand {
      flex: 1;
    }

    .doc-template .header .meta {
      text-align: right;
      min-width: 220px;
    }

    .doc-template .meta-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px 14px;
      margin-top: 6px;
    }

    .doc-template .meta-grid div {
      white-space: nowrap;
    }

    .doc-template table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }

    .doc-template th,
    .doc-template td {
      border-bottom: 1px solid #e4e4e7;
      padding: 8px 10px;
      vertical-align: top;
    }

    .doc-template th {
      width: 28%;
      text-align: left;
      color: #52525b;
      font-weight: 600;
    }

    .doc-template thead th {
      width: auto;
      background: #f4f4f5;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #71717a;
    }

    .doc-template .num {
      text-align: right;
      white-space: nowrap;
    }

    .doc-template .muted {
      color: #52525b;
    }

    .doc-template .section {
      margin-top: 14px;
    }
  </style>

  <div class="header">
    <div class="brand">
      <h1>{{organization.name}}</h1>
      <p class="muted">{{organization.fiscalName}}</p>
    </div>
    <div class="meta">
      <div><strong>Orden de trabajo</strong></div>
      <div>#{{order.number}}</div>
      <div class="muted">{{order.status}}</div>
      <div class="muted">{{order.createdAt}}</div>
    </div>
  </div>

  <hr />

  <div class="meta-grid">
    <div><strong>Actualizada:</strong> {{order.updatedAt}}</div>
    <div><strong>Kilometraje:</strong> {{order.mileage}}</div>
    <div><strong>Próximo servicio:</strong> {{order.nextMileage}}</div>
    <div><strong>Facturación:</strong> {{facturacion.status}}</div>
  </div>

  <div class="section">
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
  </div>

  <div class="section">
    <h2>Vehículo</h2>
    <table>
      <tbody>
        <tr><th>Marca</th><td>{{vehicle.make}}</td></tr>
        <tr><th>Modelo</th><td>{{vehicle.model}}</td></tr>
        <tr><th>Año</th><td>{{vehicle.year}}</td></tr>
        <tr><th>Color</th><td>{{vehicle.color}}</td></tr>
        <tr><th>Placa</th><td>{{vehicle.plate}}</td></tr>
        <tr><th>VIN</th><td>{{vehicle.vin}}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Diagnóstico</h2>
    <table>
      <tbody>
        <tr><th>Síntomas</th><td>{{order.symptoms}}</td></tr>
        <tr><th>Inspección</th><td>{{order.inspection}}</td></tr>
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Ítems</h2>
    <table>
      <thead>
        <tr>
          <th>Tipo</th>
          <th>Descripción</th>
          <th class="num">Cant.</th>
          <th class="num">P. Unit.</th>
          <th class="num">Total</th>
        </tr>
      </thead>
      <tbody>
        {{items.table}}
      </tbody>
    </table>
  </div>

  <div class="section">
    <h2>Pagos</h2>
    <table>
      <thead>
        <tr>
          <th>Método</th>
          <th class="num">Monto</th>
          <th>Referencia</th>
        </tr>
      </thead>
      <tbody>
        {{payments.table}}
      </tbody>
    </table>
  </div>

  <div class="section">
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
  </div>

  <div class="section">
    <h2>Facturación</h2>
    <table>
      <tbody>
        <tr><th>Estado</th><td>{{facturacion.status}}</td></tr>
        <tr><th>Etiqueta</th><td>{{facturacion.label}}</td></tr>
      </tbody>
    </table>
  </div>
</div>
```

## Notas

- `{{items.table}}` y `{{payments.table}}` deben resolverse como HTML de filas `<tr>...</tr>`.
- Esta plantilla está pensada para orden de trabajo. Para venta, cambia `order` por `sale` en el encabezado y los metadatos.
- Si quieres una versión más compacta para factura/venta, conviene separar el bloque de diagnóstico y reforzar el bloque de cliente y totales.
