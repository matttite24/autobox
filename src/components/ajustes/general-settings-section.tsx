"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toastManager } from "@/components/ui/toast";

type Props = {
  visible: boolean;
  formId?: string;
  title: string;
  description: string;
  orgName: string;
  commercialName: string;
  fiscalName: string;
  ruc?: string;
  address?: string;
  contact?: string;
  website?: string;
  legalRepresentative?: string;
  onSave: (name: string, data: {
    commercialName: string;
    fiscalName: string;
    ruc: string;
    address: string;
    contact: string;
    website: string;
    legalRepresentative: string;
  }) => Promise<void>;
};

export function GeneralSettingsSection({ visible, formId, title, description, orgName, commercialName, fiscalName, ruc = "", address = "", contact = "", website = "", legalRepresentative = "", onSave }: Props) {
  const [saving, setSaving] = useState(false);
  const [brandName, setBrandName] = useState(orgName);
  const [commercial, setCommercial] = useState(commercialName);
  const [fiscal, setFiscal] = useState(fiscalName);
  const [ruaVal, setRuaVal] = useState(ruc);
  const [addressVal, setAddressVal] = useState(address);
  const [contactVal, setContactVal] = useState(contact);
  const [websiteVal, setWebsiteVal] = useState(website);
  const [legalRepVal, setLegalRepVal] = useState(legalRepresentative);

  useEffect(() => {
    setBrandName(orgName);
    setCommercial(commercialName);
    setFiscal(fiscalName);
    setRuaVal(ruc);
    setAddressVal(address);
    setContactVal(contact);
    setWebsiteVal(website);
    setLegalRepVal(legalRepresentative);
  }, [orgName, commercialName, fiscalName, ruc, address, contact, website, legalRepresentative]);

  if (!visible) return null;

  return (
    <section className="mx-auto w-full max-w-3xl space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <form
        id={formId}
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          try {
            await onSave(brandName.trim() || "Taller Principal", {
              commercialName: commercial,
              fiscalName: fiscal,
              ruc: ruaVal,
              address: addressVal,
              contact: contactVal,
              website: websiteVal,
              legalRepresentative: legalRepVal,
            });
            toastManager.add({ type: "success", title: "Guardado", description: "La configuración general se actualizó." });
          } finally {
            setSaving(false);
          }
        }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="brandName">Nombre visible del taller</Label>
            <Input id="brandName" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="commercialName">Nombre comercial</Label>
            <Input id="commercialName" value={commercial} onChange={(e) => setCommercial(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="fiscalName">Nombre fiscal</Label>
          <Input id="fiscalName" value={fiscal} onChange={(e) => setFiscal(e.target.value)} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ruc">RUC / ID</Label>
            <Input id="ruc" value={ruaVal} onChange={(e) => setRuaVal(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="legalRepresentative">Representante Legal</Label>
            <Input id="legalRepresentative" value={legalRepVal} onChange={(e) => setLegalRepVal(e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Dirección</Label>
          <Input id="address" value={addressVal} onChange={(e) => setAddressVal(e.target.value)} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="contact">Contacto (Teléfono/Email)</Label>
            <Input id="contact" value={contactVal} onChange={(e) => setContactVal(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="website">Página Web</Label>
            <Input id="website" value={websiteVal} onChange={(e) => setWebsiteVal(e.target.value)} />
          </div>
        </div>
      </form>
    </section>
  );
}
