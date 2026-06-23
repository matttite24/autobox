"use client";

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 30,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#111827",
    lineHeight: 1.35,
  },
  header: {
    marginBottom: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    borderBottomStyle: "solid",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  brand: { fontSize: 16, fontWeight: 700 },
  subtitle: { marginTop: 4, color: "#6b7280", fontSize: 9 },
  headingMeta: {
    alignItems: "flex-end",
  },
  headingMetaTop: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
  },
  headingMetaBottom: {
    fontSize: 9,
    color: "#6b7280",
    textTransform: "uppercase",
  },
  section: {
    marginTop: 12,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: "#111827",
  },
  card: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 10,
  },
  grid2: {
    flexDirection: "row",
    gap: 10,
  },
  col: { flex: 1 },
  label: { color: "#6b7280", fontSize: 8, marginBottom: 2 },
  value: { fontSize: 10, fontWeight: 500 },
  table: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, overflow: "hidden" },
  tableHead: { flexDirection: "row", backgroundColor: "#f9fafb", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  th: { paddingVertical: 8, paddingHorizontal: 8, fontSize: 8, fontWeight: 700, color: "#374151" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  td: { paddingVertical: 7, paddingHorizontal: 8, fontSize: 9 },
  right: { textAlign: "right" },
  muted: { color: "#6b7280" },
  summary: {
    marginTop: 12,
    marginLeft: "auto",
    width: 190,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 10,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  summaryTotal: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: "#e5e7eb", fontSize: 11, fontWeight: 700 },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 8,
    color: "#6b7280",
    fontSize: 8,
  },
});

type LineItem = {
  id: string;
  type: "part" | "labor" | "service";
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
};

type Payment = {
  id: string;
  amount: number;
  method: "Efectivo" | "Tarjeta" | "Transferencia";
  date: number;
  reference?: string;
};

export function PdfDocumentShell({
  title,
  subtitle,
  organizationLines,
  documentLines,
  headingRight,
  sections,
  items,
  payments,
  totals,
  footerLeft,
  footerRight,
}: {
  title: string;
  subtitle: string;
  organizationLines: Array<{ label: string; value: string }>;
  documentLines: Array<{ label: string; value: string }>;
  headingRight?: { top: string; bottom: string };
  sections: ReactNode;
  items: LineItem[];
  payments?: Payment[];
  totals: Array<{ label: string; value: string; strong?: boolean }>;
  footerLeft: string;
  footerRight: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View style={styles.topRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.brand}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
              <View style={{ marginTop: 8 }}>
                {organizationLines.map((line) => (
                  <View key={line.label} style={{ flexDirection: "row", gap: 6, marginBottom: 2 }}>
                    <Text style={styles.value}>{line.value}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.headingMeta}>
              {headingRight && (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.headingMetaTop}>{headingRight.top}</Text>
                  <Text style={styles.headingMetaBottom}>{headingRight.bottom}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={[styles.card, { marginBottom: 2 }]}>
          <Text style={styles.sectionTitle}>Documento</Text>
          <View style={styles.grid2}>
            {documentLines.map((line) => (
              <View key={line.label} style={styles.col}>
                <Text style={styles.label}>{line.label}</Text>
                <Text style={styles.value}>{line.value}</Text>
              </View>
            ))}
          </View>
        </View>

        {sections}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detalle</Text>
          <View style={styles.table}>
            <View style={styles.tableHead}>
              <Text style={[styles.th, { flex: 0.9 }]}>Tipo</Text>
              <Text style={[styles.th, { flex: 3 }]}>Descripción</Text>
              <Text style={[styles.th, { flex: 0.8, textAlign: "right" }]}>Cant.</Text>
              <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>P. Unit.</Text>
              <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Total</Text>
            </View>
            {items.length === 0 ? (
              <View style={styles.tr}>
                <Text style={[styles.td, styles.muted]}>Sin ítems registrados</Text>
              </View>
            ) : (
              items.map((item) => (
                <View key={item.id} style={styles.tr}>
                  <Text style={[styles.td, { flex: 0.9 }]}>{item.type === "part" ? "Repuesto" : item.type === "service" ? "Servicio" : "Mano de obra"}</Text>
                  <Text style={[styles.td, { flex: 3 }]}>{item.description}</Text>
                  <Text style={[styles.td, { flex: 0.8, textAlign: "right" }]}>{item.quantity}</Text>
                  <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>{item.unitPrice.toFixed(2)}</Text>
                  <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>{item.total.toFixed(2)}</Text>
                </View>
              ))
            )}
          </View>
        </View>

        {payments && payments.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pagos</Text>
            <View style={styles.table}>
              <View style={styles.tableHead}>
                <Text style={[styles.th, { flex: 1 }]}>Método</Text>
                <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Monto</Text>
                <Text style={[styles.th, { flex: 2 }]}>Referencia</Text>
              </View>
              {payments.map((payment) => (
                <View key={payment.id} style={styles.tr}>
                  <Text style={[styles.td, { flex: 1 }]}>{payment.method}</Text>
                  <Text style={[styles.td, { flex: 1, textAlign: "right" }]}>{payment.amount.toFixed(2)}</Text>
                  <Text style={[styles.td, { flex: 2 }]}>{payment.reference || "—"}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.summary}>
          {totals.map((row) => (
            <View key={row.label} style={styles.summaryRow}>
              <Text style={row.strong ? styles.summaryTotal : styles.muted}>{row.label}</Text>
              <Text style={row.strong ? styles.summaryTotal : undefined}>{row.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text>{footerLeft}</Text>
          <Text>{footerRight}</Text>
        </View>
      </Page>
    </Document>
  );
}
