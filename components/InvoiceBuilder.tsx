import { useState, useRef } from "react";

// ─── Utilities ────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 8);
const toDay = () => new Date().toISOString().slice(0, 10);
const toINR = (n: any) => "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const toN = (n: any) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const calcLine = (it: any) => {
  const q = +it.qty || 0, p = +it.price || 0, d = +it.disc || 0, t = +it.tax || 0;
  const taxable = q * p * (1 - d / 100);
  return { taxable, taxAmt: taxable * t / 100, total: taxable * (1 + t / 100), base: q * p, discAmt: q * p * d / 100 };
};

const calcAll = (items, gstMode) => {
  let sub = 0, disc = 0, taxable = 0, tax = 0;
  items.forEach(it => { const c = calcLine(it); sub += c.base; disc += c.discAmt; taxable += c.taxable; tax += c.taxAmt; });
  return { sub, disc, taxable, tax, grand: taxable + tax, cgst: gstMode === "cgst_sgst" ? tax / 2 : 0, sgst: gstMode === "cgst_sgst" ? tax / 2 : 0, igst: gstMode === "igst" ? tax : 0 };
};

// ─── Constants ────────────────────────────────────────────────────────────────
const DOC_TYPES = ["Tax Invoice","GST Invoice","Standard Invoice","Quotation","Estimate","Proforma Invoice","Purchase Order","Delivery Challan","Receipt","Payment Receipt","Service Invoice"];
const UNITS = ["Pcs","Nos","Kg","Gm","Ltr","Mtr","Ft","Hr","Day","Month","Set","Box","Pair"];
const IND_STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Puducherry","Chandigarh"];
const TPLS = [{id:"modern",label:"Modern"},{id:"minimal",label:"Minimal"},{id:"classic",label:"GST Classic"},{id:"warm",label:"Warm Indian"}];
const mkItem = () => ({ id: uid(), name: "", desc: "", hsn: "", qty: "1", unit: "Pcs", price: "", disc: "0", tax: "18" });
const INIT_BIZ = { name:"", owner:"", gst:"", pan:"", addr:"", city:"", state:"Maharashtra", country:"India", phone:"", email:"", web:"", bank:"", ifsc:"", upi:"", logo:null };
const INIT_CUST = { name:"", company:"", gst:"", addr:"", city:"", state:"", phone:"", email:"" };
const INIT_DOC = { type:"Tax Invoice", num:"INV-001", date:toDay(), due:"", gst:"cgst_sgst", notes:"", terms:"Thank you for your business." };

// ─── AI Parser ────────────────────────────────────────────────────────────────
async function aiParse(text) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514", max_tokens: 800,
      messages: [{ role: "user", content: `Convert this text into invoice line items. Return ONLY a valid JSON array, no markdown fences, no explanation:\n\n"${text}"\n\nEach object must have: name (string), desc (string, can be ""), hsn (string, can be ""), qty (number), unit (string, default "Pcs"), price (number per unit), disc (number 0-100, default 0), tax (number 0-28, default 18)` }]
    })
  });
  const d = await res.json();
  const raw = (d.content?.[0]?.text || "[]").replace(/```[a-z]*/g, "").replace(/```/g, "").trim();
  return JSON.parse(raw);
}

// ─── Invoice Templates ────────────────────────────────────────────────────────

function TplModern({ doc, biz, cust, items, totals }) {
  const N = "#1e3a5f", A = "#f59e0b";
  const visItems = items.filter(it => it.name);
  return (
    <div style={{ fontFamily: "'Segoe UI',Arial,sans-serif", fontSize: "11px", color: "#1e293b", background: "#fff" }}>
      <div style={{ background: N, color: "#fff", padding: "20px 26px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          {biz.logo && <img src={biz.logo} alt="" style={{ height: "44px", marginBottom: "6px", display: "block" }} />}
          <div style={{ fontSize: "21px", fontWeight: "800", letterSpacing: "-0.5px" }}>{biz.name || "Your Business Name"}</div>
          {biz.gst && <div style={{ fontSize: "8px", opacity: 0.8, marginTop: "2px" }}>GSTIN: {biz.gst}</div>}
          <div style={{ fontSize: "8px", opacity: 0.75, marginTop: "2px", lineHeight: "1.6" }}>
            {[biz.addr, biz.city, biz.state].filter(Boolean).join(", ")}
            {biz.phone && <span> · {biz.phone}</span>}
            {biz.email && <span> · {biz.email}</span>}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "26px", fontWeight: "900", letterSpacing: "1px", textTransform: "uppercase", color: A }}>{doc.type}</div>
          <div style={{ fontSize: "9px", marginTop: "6px", opacity: 0.9, lineHeight: "1.9" }}>
            <div>No: <strong>{doc.num}</strong></div>
            <div>Date: <strong>{doc.date}</strong></div>
            {doc.due && <div>Due: <strong>{doc.due}</strong></div>}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", background: "#f8fafc", padding: "12px 26px", borderBottom: "1px solid #e2e8f0", gap: "16px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "7px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1.5px", color: "#94a3b8", marginBottom: "4px" }}>Bill To</div>
          <div style={{ fontWeight: "700", fontSize: "12px" }}>{cust.name || cust.company || "Customer Name"}</div>
          {cust.company && cust.name && <div style={{ fontSize: "9px", color: "#475569" }}>{cust.company}</div>}
          {cust.gst && <div style={{ fontSize: "8px", color: "#475569" }}>GSTIN: {cust.gst}</div>}
          <div style={{ fontSize: "8px", color: "#475569", marginTop: "2px", lineHeight: "1.5" }}>
            {[cust.addr, cust.city, cust.state].filter(Boolean).join(", ")}
            {cust.phone && <span> · {cust.phone}</span>}
          </div>
        </div>
        {(biz.bank || biz.upi) && <div style={{ flex: 1, borderLeft: "1px solid #e2e8f0", paddingLeft: "16px" }}>
          <div style={{ fontSize: "7px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "1.5px", color: "#94a3b8", marginBottom: "4px" }}>Payment Details</div>
          <div style={{ fontSize: "9px", color: "#475569", lineHeight: "1.8" }}>
            {biz.bank && <div>A/C: {biz.bank}</div>}
            {biz.ifsc && <div>IFSC: {biz.ifsc}</div>}
            {biz.upi && <div>UPI: {biz.upi}</div>}
          </div>
        </div>}
      </div>
      <div style={{ padding: "0 26px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "14px" }}>
          <thead>
            <tr style={{ background: N, color: "#fff" }}>
              {[["#","center","22px"],["Item / Description","left",null],["HSN","center","50px"],["Qty","center","55px"],["Rate","right","68px"],["Disc%","right","44px"],["GST%","right","44px"],["Amount","right","80px"]].map(([h,a,w]) =>
                <th key={h} style={{ padding: "7px 5px", textAlign: a, fontSize: "8px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.5px", width: w }}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {visItems.length > 0 ? visItems.map((it, i) => {
              const c = calcLine(it);
              return <tr key={it.id} style={{ background: i % 2 ? "#f8fafc" : "#fff", borderBottom: "1px solid #f1f5f9" }}>
                <td style={{ padding: "7px 5px", textAlign: "center", fontSize: "9px", color: "#94a3b8" }}>{i + 1}</td>
                <td style={{ padding: "7px 5px", textAlign: "left" }}>
                  <div style={{ fontWeight: "600", fontSize: "10px" }}>{it.name}</div>
                  {it.desc && <div style={{ fontSize: "8px", color: "#64748b", marginTop: "1px" }}>{it.desc}</div>}
                </td>
                <td style={{ padding: "7px 5px", textAlign: "center", fontSize: "8px", color: "#64748b" }}>{it.hsn}</td>
                <td style={{ padding: "7px 5px", textAlign: "center", fontSize: "9px" }}>{it.qty} {it.unit}</td>
                <td style={{ padding: "7px 5px", textAlign: "right", fontSize: "9px" }}>{toN(it.price)}</td>
                <td style={{ padding: "7px 5px", textAlign: "right", fontSize: "9px", color: "#64748b" }}>{it.disc}%</td>
                <td style={{ padding: "7px 5px", textAlign: "right", fontSize: "9px", color: "#64748b" }}>{it.tax}%</td>
                <td style={{ padding: "7px 5px", textAlign: "right", fontSize: "10px", fontWeight: "600" }}>{toN(c.total)}</td>
              </tr>;
            }) : <tr><td colSpan="8" style={{ padding: "20px", textAlign: "center", color: "#94a3b8", fontSize: "10px" }}>No items added yet</td></tr>}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 26px 16px" }}>
        <div style={{ width: "250px" }}>
          {totals.disc > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "9px", color: "#22c55e", borderBottom: "1px solid #f1f5f9" }}><span>Discount</span><span>-{toINR(totals.disc)}</span></div>}
          {doc.gst === "cgst_sgst" && totals.tax > 0 && <>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "9px", color: "#64748b", borderBottom: "1px solid #f1f5f9" }}><span>CGST</span><span>{toINR(totals.cgst)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "9px", color: "#64748b", borderBottom: "1px solid #f1f5f9" }}><span>SGST</span><span>{toINR(totals.sgst)}</span></div>
          </>}
          {doc.gst === "igst" && totals.tax > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "9px", color: "#64748b", borderBottom: "1px solid #f1f5f9" }}><span>IGST</span><span>{toINR(totals.igst)}</span></div>}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", background: N, color: "#fff", marginTop: "4px", borderRadius: "4px" }}>
            <span style={{ fontWeight: "700", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Grand Total</span>
            <span style={{ fontWeight: "800", fontSize: "14px", color: A }}>{toINR(totals.grand)}</span>
          </div>
        </div>
      </div>
      {(doc.notes || doc.terms) && <div style={{ display: "flex", gap: "16px", padding: "0 26px 16px", fontSize: "9px", color: "#475569" }}>
        {doc.notes && <div style={{ flex: 1 }}><div style={{ fontWeight: "700", textTransform: "uppercase", fontSize: "7px", letterSpacing: "1px", color: N, marginBottom: "3px" }}>Notes</div>{doc.notes}</div>}
        {doc.terms && <div style={{ flex: 1 }}><div style={{ fontWeight: "700", textTransform: "uppercase", fontSize: "7px", letterSpacing: "1px", color: N, marginBottom: "3px" }}>Terms & Conditions</div>{doc.terms}</div>}
      </div>}
      <div style={{ borderTop: "1px solid #e2e8f0", padding: "7px 26px", textAlign: "center", fontSize: "7px", color: "#94a3b8" }}>
        Generated using <strong>InvoiceHub India</strong> · Create free invoices at invoicehub.in
      </div>
    </div>
  );
}

function TplMinimal({ doc, biz, cust, items, totals }) {
  const visItems = items.filter(it => it.name);
  return (
    <div style={{ fontFamily: "Georgia,'Times New Roman',serif", fontSize: "11px", color: "#111", background: "#fff", padding: "36px 40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "36px" }}>
        <div>
          {biz.logo && <img src={biz.logo} alt="" style={{ height: "36px", marginBottom: "8px", display: "block" }} />}
          <div style={{ fontSize: "22px", fontWeight: "normal", letterSpacing: "-1px" }}>{biz.name || "Business Name"}</div>
          <div style={{ fontSize: "9px", color: "#999", marginTop: "4px", lineHeight: "1.7" }}>
            {[biz.addr, biz.city, biz.state].filter(Boolean).join(", ")}
            {biz.phone && <div>Tel: {biz.phone}</div>}
            {biz.email && <div>{biz.email}</div>}
            {biz.gst && <div>GSTIN: {biz.gst}</div>}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "10px", letterSpacing: "5px", textTransform: "uppercase", color: "#bbb" }}>{doc.type}</div>
          <div style={{ fontSize: "11px", color: "#888", marginTop: "10px", lineHeight: "1.9" }}>
            {doc.num}<br />{doc.date}{doc.due && <><br />Due {doc.due}</>}
          </div>
        </div>
      </div>
      <div style={{ borderTop: "1px solid #ddd", borderBottom: "1px solid #ddd", padding: "14px 0", marginBottom: "30px" }}>
        <div style={{ fontSize: "7px", letterSpacing: "3px", textTransform: "uppercase", color: "#bbb", marginBottom: "6px" }}>Invoice For</div>
        <div style={{ fontSize: "14px" }}>{cust.name || cust.company || "Client Name"}</div>
        {cust.company && cust.name && <div style={{ fontSize: "10px", color: "#666" }}>{cust.company}</div>}
        <div style={{ fontSize: "9px", color: "#999", marginTop: "2px", lineHeight: "1.6" }}>
          {[cust.addr, cust.city, cust.state].filter(Boolean).join(", ")}
          {cust.gst && <span> · GSTIN: {cust.gst}</span>}
        </div>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "30px" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #111" }}>
            {[["Description","left",null],["Qty","right","65px"],["Rate (₹)","right","80px"],["Amount (₹)","right","80px"]].map(([h,a,w]) =>
              <th key={h} style={{ padding: "6px 0", textAlign: a, fontSize: "7px", fontWeight: "normal", textTransform: "uppercase", letterSpacing: "2.5px", color: "#aaa", width: w }}>{h}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {visItems.length > 0 ? visItems.map(it => {
            const c = calcLine(it);
            return <tr key={it.id} style={{ borderBottom: "1px solid #f4f4f4" }}>
              <td style={{ padding: "10px 0" }}>
                <div style={{ fontSize: "11px" }}>{it.name}</div>
                {it.desc && <div style={{ fontSize: "8px", color: "#999", marginTop: "1px" }}>{it.desc}</div>}
                {it.hsn && <div style={{ fontSize: "8px", color: "#ccc" }}>HSN: {it.hsn}</div>}
              </td>
              <td style={{ padding: "10px 0", textAlign: "right", fontSize: "10px", color: "#666" }}>{it.qty} {it.unit}</td>
              <td style={{ padding: "10px 0", textAlign: "right", fontSize: "10px", color: "#666" }}>{toN(it.price)}</td>
              <td style={{ padding: "10px 0", textAlign: "right", fontSize: "11px", fontWeight: "600" }}>{toN(c.total)}</td>
            </tr>;
          }) : <tr><td colSpan="4" style={{ padding: "20px 0", textAlign: "center", color: "#ccc", fontSize: "10px" }}>No items added</td></tr>}
        </tbody>
      </table>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "28px" }}>
        <div style={{ width: "200px", fontSize: "10px" }}>
          {totals.disc > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#aaa" }}><span>Discount</span><span>-{toINR(totals.disc)}</span></div>}
          {doc.gst === "cgst_sgst" && totals.tax > 0 && <>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#aaa" }}><span>CGST</span><span>{toINR(totals.cgst)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#aaa" }}><span>SGST</span><span>{toINR(totals.sgst)}</span></div>
          </>}
          {doc.gst === "igst" && totals.tax > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", color: "#aaa" }}><span>IGST</span><span>{toINR(totals.igst)}</span></div>}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderTop: "1px solid #111", marginTop: "4px", fontSize: "13px" }}>
            <span>Total Due</span><span style={{ fontWeight: "700" }}>{toINR(totals.grand)}</span>
          </div>
        </div>
      </div>
      {(biz.bank || biz.upi || doc.notes || doc.terms) && <div style={{ borderTop: "1px solid #eee", paddingTop: "18px", display: "flex", gap: "24px", fontSize: "9px", color: "#888" }}>
        {(biz.bank || biz.upi) && <div style={{ flex: 1 }}>
          <div style={{ fontSize: "7px", letterSpacing: "2px", textTransform: "uppercase", color: "#bbb", marginBottom: "4px" }}>Payment</div>
          {biz.bank && <div>A/C: {biz.bank}</div>}
          {biz.ifsc && <div>IFSC: {biz.ifsc}</div>}
          {biz.upi && <div>UPI: {biz.upi}</div>}
        </div>}
        {doc.notes && <div style={{ flex: 1 }}><div style={{ fontSize: "7px", letterSpacing: "2px", textTransform: "uppercase", color: "#bbb", marginBottom: "4px" }}>Notes</div>{doc.notes}</div>}
        {doc.terms && <div style={{ flex: 1 }}><div style={{ fontSize: "7px", letterSpacing: "2px", textTransform: "uppercase", color: "#bbb", marginBottom: "4px" }}>Terms</div>{doc.terms}</div>}
      </div>}
      <div style={{ marginTop: "28px", textAlign: "center", fontSize: "7px", color: "#ddd", letterSpacing: "2px", textTransform: "uppercase" }}>
        Generated using InvoiceHub India · invoicehub.in
      </div>
    </div>
  );
}

function TplClassic({ doc, biz, cust, items, totals }) {
  const B = "1px solid #000";
  const visItems = items.filter(it => it.name);
  return (
    <div style={{ fontFamily: "Arial,sans-serif", fontSize: "10px", color: "#000", background: "#fff", padding: "16px", border: "2px solid #000" }}>
      <div style={{ textAlign: "center", borderBottom: B, padding: "8px", background: "#f0f0f0" }}>
        <div style={{ fontSize: "17px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "3px" }}>{doc.type}</div>
      </div>
      <div style={{ display: "flex", borderBottom: B }}>
        <div style={{ flex: 2, padding: "10px", borderRight: B }}>
          {biz.logo && <img src={biz.logo} alt="" style={{ height: "34px", marginBottom: "4px", display: "block" }} />}
          <div style={{ fontWeight: "bold", fontSize: "13px" }}>{biz.name || "Business Name"}</div>
          <div style={{ fontSize: "8px", marginTop: "3px", lineHeight: "1.6", color: "#333" }}>
            {biz.addr && <div>{biz.addr}</div>}
            {(biz.city || biz.state) && <div>{[biz.city, biz.state].filter(Boolean).join(", ")}</div>}
            {biz.phone && <div>Phone: {biz.phone}</div>}
            {biz.email && <div>Email: {biz.email}</div>}
          </div>
        </div>
        <div style={{ flex: 1, padding: "10px" }}>
          <table style={{ fontSize: "9px", width: "100%", borderCollapse: "collapse" }}>
            <tbody>
              {[["Invoice No", doc.num], ["Date", doc.date], ["Due Date", doc.due || "On Receipt"], ["GSTIN", biz.gst || "________________"], ["PAN", biz.pan || "________________"]].map(([l, v]) =>
                <tr key={l}><td style={{ padding: "2px 0", color: "#555", paddingRight: "6px", whiteSpace: "nowrap" }}>{l}:</td><td style={{ fontWeight: "bold" }}>{v}</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ display: "flex", borderBottom: B }}>
        <div style={{ flex: 1, padding: "8px", borderRight: B }}>
          <div style={{ fontSize: "7px", fontWeight: "bold", textTransform: "uppercase", color: "#555", marginBottom: "4px", letterSpacing: "1px" }}>Bill To:</div>
          <div style={{ fontWeight: "bold", fontSize: "11px" }}>{cust.name || "Customer Name"}</div>
          {cust.company && <div style={{ fontSize: "9px" }}>{cust.company}</div>}
          {cust.gst && <div style={{ fontSize: "8px" }}>GSTIN: {cust.gst}</div>}
          <div style={{ fontSize: "8px", color: "#444", lineHeight: "1.5", marginTop: "2px" }}>
            {cust.addr && <div>{cust.addr}</div>}
            {(cust.city || cust.state) && <div>{[cust.city, cust.state].filter(Boolean).join(", ")}</div>}
            {cust.phone && <div>Ph: {cust.phone}</div>}
            {cust.email && <div>{cust.email}</div>}
          </div>
        </div>
        {(biz.bank || biz.upi) && <div style={{ flex: 1, padding: "8px" }}>
          <div style={{ fontSize: "7px", fontWeight: "bold", textTransform: "uppercase", color: "#555", marginBottom: "4px", letterSpacing: "1px" }}>Bank Details:</div>
          <div style={{ fontSize: "8px", lineHeight: "1.8" }}>
            {biz.bank && <div><strong>A/C:</strong> {biz.bank}</div>}
            {biz.ifsc && <div><strong>IFSC:</strong> {biz.ifsc}</div>}
            {biz.upi && <div><strong>UPI:</strong> {biz.upi}</div>}
          </div>
        </div>}
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "#f0f0f0" }}>
            {[["#","center","22px"],["Description","left",null],["HSN","center","48px"],["Qty","center","55px"],["Rate","right","68px"],["Disc%","right","40px"],["Tax%","right","40px"],["Taxable","right","72px"],["Total","right","76px"]].map(([h,a,w]) =>
              <th key={h} style={{ border: B, padding: "5px 4px", fontSize: "7px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.3px", textAlign: a, width: w }}>{h}</th>
            )}
          </tr>
        </thead>
        <tbody>
          {visItems.length > 0 ? visItems.map((it, i) => {
            const c = calcLine(it);
            return <tr key={it.id}>
              <td style={{ border: B, padding: "5px 4px", textAlign: "center", fontSize: "8px" }}>{i + 1}</td>
              <td style={{ border: B, padding: "5px 4px", textAlign: "left" }}>
                <div style={{ fontWeight: "bold", fontSize: "9px" }}>{it.name}</div>
                {it.desc && <div style={{ color: "#555", fontSize: "8px" }}>{it.desc}</div>}
              </td>
              <td style={{ border: B, padding: "5px 4px", textAlign: "center", fontSize: "8px" }}>{it.hsn}</td>
              <td style={{ border: B, padding: "5px 4px", textAlign: "center", fontSize: "8px" }}>{it.qty} {it.unit}</td>
              <td style={{ border: B, padding: "5px 4px", textAlign: "right", fontSize: "8px" }}>{toN(it.price)}</td>
              <td style={{ border: B, padding: "5px 4px", textAlign: "right", fontSize: "8px" }}>{it.disc}%</td>
              <td style={{ border: B, padding: "5px 4px", textAlign: "right", fontSize: "8px" }}>{it.tax}%</td>
              <td style={{ border: B, padding: "5px 4px", textAlign: "right", fontSize: "8px" }}>{toN(c.taxable)}</td>
              <td style={{ border: B, padding: "5px 4px", textAlign: "right", fontSize: "9px", fontWeight: "bold" }}>{toN(c.total)}</td>
            </tr>;
          }) : Array(2).fill(null).map((_, i) => (
            <tr key={i}>{Array(9).fill(null).map((_, j) => <td key={j} style={{ border: B, padding: "14px 4px" }}></td>)}</tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: "flex" }}>
        <div style={{ flex: 2, borderRight: B, borderLeft: B, borderBottom: B, padding: "8px", fontSize: "8px" }}>
          {doc.notes && <div style={{ marginBottom: "6px" }}><strong>Notes: </strong><span style={{ color: "#444" }}>{doc.notes}</span></div>}
          {doc.terms && <div><strong>Terms: </strong><span style={{ color: "#444" }}>{doc.terms}</span></div>}
          <div style={{ marginTop: "20px", paddingTop: "8px", borderTop: "1px dashed #ccc" }}>
            <div style={{ fontWeight: "bold", fontSize: "8px", marginBottom: "20px" }}>Authorised Signatory</div>
            <div style={{ fontSize: "8px", color: "#999" }}>{biz.name}</div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px" }}>
            <tbody>
              {[[`Subtotal`, toINR(totals.sub)], totals.disc > 0 && ["Discount", `-${toINR(totals.disc)}`], doc.gst === "cgst_sgst" && totals.tax > 0 && ["CGST", toINR(totals.cgst)], doc.gst === "cgst_sgst" && totals.tax > 0 && ["SGST", toINR(totals.sgst)], doc.gst === "igst" && totals.tax > 0 && ["IGST", toINR(totals.igst)]].filter(Boolean).map(([l, v]) =>
                <tr key={l}><td style={{ padding: "5px 8px", borderRight: B, borderBottom: B, borderLeft: B }}>{l}</td><td style={{ padding: "5px 8px", borderRight: B, borderBottom: B, textAlign: "right", color: l === "Discount" ? "green" : "inherit" }}>{v}</td></tr>
              )}
              <tr style={{ background: "#f0f0f0" }}><td style={{ padding: "7px 8px", fontWeight: "bold", fontSize: "10px", borderRight: B, borderBottom: B, borderLeft: B }}>Grand Total</td><td style={{ padding: "7px 8px", fontWeight: "bold", fontSize: "11px", textAlign: "right", borderRight: B, borderBottom: B }}>{toINR(totals.grand)}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
      <div style={{ textAlign: "center", padding: "5px", fontSize: "7px", color: "#aaa", marginTop: "2px" }}>Generated using InvoiceHub India · invoicehub.in</div>
    </div>
  );
}

function TplWarm({ doc, biz, cust, items, totals }) {
  const visItems = items.filter(it => it.name);
  return (
    <div style={{ fontFamily: "'Palatino Linotype',Palatino,serif", fontSize: "11px", color: "#2d1a00", background: "#fffdf8", border: "3px double #c97316" }}>
      <div style={{ background: "linear-gradient(135deg, #7c2d12, #c2410c, #d97706)", color: "#fff", padding: "18px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          {biz.logo && <img src={biz.logo} alt="" style={{ height: "40px", marginBottom: "5px", display: "block", filter: "brightness(0) invert(1)" }} />}
          <div style={{ fontSize: "19px", fontWeight: "bold" }}>{biz.name || "व्यवसाय का नाम"}</div>
          {biz.gst && <div style={{ fontSize: "8px", opacity: 0.8, marginTop: "2px" }}>GSTIN: {biz.gst}</div>}
          <div style={{ fontSize: "8px", opacity: 0.75, marginTop: "1px", lineHeight: "1.5" }}>
            {[biz.addr, biz.city, biz.state].filter(Boolean).join(", ")}
            {biz.phone && <span> · {biz.phone}</span>}
          </div>
        </div>
        <div style={{ textAlign: "right", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", borderRadius: "6px", padding: "10px 14px" }}>
          <div style={{ fontSize: "17px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1px" }}>{doc.type}</div>
          <div style={{ fontSize: "8px", marginTop: "5px", opacity: 0.9, lineHeight: "1.9" }}>
            <div>No: <strong>{doc.num}</strong></div>
            <div>Date: <strong>{doc.date}</strong></div>
            {doc.due && <div>Due: <strong>{doc.due}</strong></div>}
          </div>
        </div>
      </div>
      <div style={{ height: "3px", background: "linear-gradient(90deg, #c97316, #fbbf24, #c97316)" }} />
      <div style={{ padding: "12px 24px", background: "#fef3c7", borderBottom: "1px solid #fde68a", display: "flex", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: "7px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1.5px", color: "#92400e", marginBottom: "4px" }}>Bill To</div>
          <div style={{ fontWeight: "bold", fontSize: "12px", color: "#78350f" }}>{cust.name || cust.company || "Customer Name"}</div>
          {cust.company && cust.name && <div style={{ fontSize: "9px", color: "#92400e" }}>{cust.company}</div>}
          {cust.gst && <div style={{ fontSize: "8px", color: "#78350f" }}>GSTIN: {cust.gst}</div>}
          <div style={{ fontSize: "8px", color: "#92400e", lineHeight: "1.5" }}>{[cust.addr, cust.city, cust.state].filter(Boolean).join(", ")}</div>
        </div>
        {(biz.bank || biz.upi) && <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "7px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "1.5px", color: "#92400e", marginBottom: "4px" }}>Payment</div>
          <div style={{ fontSize: "8px", color: "#78350f", lineHeight: "1.8" }}>
            {biz.bank && <div>A/C: {biz.bank}</div>}
            {biz.ifsc && <div>IFSC: {biz.ifsc}</div>}
            {biz.upi && <div>UPI: {biz.upi}</div>}
          </div>
        </div>}
      </div>
      <div style={{ padding: "0 24px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "12px" }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #c97316" }}>
              {[["#","center","22px"],["Item / Description","left",null],["HSN","center","50px"],["Qty","center","55px"],["Rate","right","70px"],["GST%","right","44px"],["Amount","right","78px"]].map(([h,a,w]) =>
                <th key={h} style={{ padding: "6px 4px", textAlign: a, fontSize: "7px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.8px", color: "#92400e", width: w }}>{h}</th>
              )}
            </tr>
          </thead>
          <tbody>
            {visItems.length > 0 ? visItems.map((it, i) => {
              const c = calcLine(it);
              return <tr key={it.id} style={{ borderBottom: "1px solid #fde68a", background: i % 2 ? "rgba(254,243,199,0.5)" : "transparent" }}>
                <td style={{ padding: "8px 4px", textAlign: "center", fontSize: "8px", color: "#92400e" }}>{i + 1}</td>
                <td style={{ padding: "8px 4px", textAlign: "left" }}>
                  <div style={{ fontWeight: "600", fontSize: "10px", color: "#451a03" }}>{it.name}</div>
                  {it.desc && <div style={{ fontSize: "8px", color: "#92400e", marginTop: "1px" }}>{it.desc}</div>}
                </td>
                <td style={{ padding: "8px 4px", textAlign: "center", fontSize: "8px", color: "#92400e" }}>{it.hsn}</td>
                <td style={{ padding: "8px 4px", textAlign: "center", fontSize: "8px" }}>{it.qty} {it.unit}</td>
                <td style={{ padding: "8px 4px", textAlign: "right", fontSize: "9px" }}>{toN(it.price)}</td>
                <td style={{ padding: "8px 4px", textAlign: "right", fontSize: "8px", color: "#92400e" }}>{it.tax}%</td>
                <td style={{ padding: "8px 4px", textAlign: "right", fontSize: "10px", fontWeight: "bold", color: "#78350f" }}>{toN(c.total)}</td>
              </tr>;
            }) : <tr><td colSpan="7" style={{ padding: "20px", textAlign: "center", color: "#c97316", fontSize: "10px", opacity: 0.5 }}>No items added yet</td></tr>}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "10px 24px 14px" }}>
        <div style={{ width: "230px", background: "#fef3c7", borderRadius: "6px", padding: "10px 12px", border: "1px solid #fde68a", fontSize: "9px", color: "#92400e" }}>
          {totals.disc > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span>Discount</span><span>-{toINR(totals.disc)}</span></div>}
          {doc.gst === "cgst_sgst" && totals.tax > 0 && <>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span>CGST</span><span>{toINR(totals.cgst)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span>SGST</span><span>{toINR(totals.sgst)}</span></div>
          </>}
          {doc.gst === "igst" && totals.tax > 0 && <div style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}><span>IGST</span><span>{toINR(totals.igst)}</span></div>}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 10px", background: "linear-gradient(135deg,#7c2d12,#d97706)", color: "#fff", borderRadius: "4px", marginTop: "8px", fontSize: "11px", fontWeight: "bold" }}>
            <span>कुल राशि</span><span>{toINR(totals.grand)}</span>
          </div>
        </div>
      </div>
      {(doc.notes || doc.terms) && <div style={{ padding: "0 24px 14px", display: "flex", gap: "16px", fontSize: "8px", color: "#92400e" }}>
        {doc.notes && <div style={{ flex: 1 }}><div style={{ fontWeight: "bold", fontSize: "7px", textTransform: "uppercase", letterSpacing: "1px", color: "#78350f", marginBottom: "3px" }}>Notes</div>{doc.notes}</div>}
        {doc.terms && <div style={{ flex: 1 }}><div style={{ fontWeight: "bold", fontSize: "7px", textTransform: "uppercase", letterSpacing: "1px", color: "#78350f", marginBottom: "3px" }}>Terms</div>{doc.terms}</div>}
      </div>}
      <div style={{ height: "3px", background: "linear-gradient(90deg,#c97316,#fbbf24,#c97316)" }} />
      <div style={{ textAlign: "center", padding: "6px", fontSize: "7px", color: "#c97316", letterSpacing: "1px", background: "#fffbeb" }}>
        Generated using InvoiceHub India · invoicehub.in
      </div>
    </div>
  );
}

function Invoice({ tpl, ...props }) {
  if (tpl === "minimal") return <TplMinimal {...props} />;
  if (tpl === "classic") return <TplClassic {...props} />;
  if (tpl === "warm") return <TplWarm {...props} />;
  return <TplModern {...props} />;
}

// ─── UI Atoms ─────────────────────────────────────────────────────────────────
const inp = { border: "1px solid #e2e8f0", borderRadius: "6px", padding: "8px 10px", fontSize: "13px", color: "#1e293b", outline: "none", background: "#fff", width: "100%", boxSizing: "border-box", fontFamily: "inherit" };
const lbl = { fontSize: "10px", fontWeight: "600", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "4px" };

function Inp({ label, value, onChange, type = "text", placeholder = "", style = {} }) {
  return <div style={{ display: "flex", flexDirection: "column" }}>
    {label && <label style={lbl}>{label}</label>}
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ ...inp, ...style }}
      onFocus={e => e.target.style.borderColor = "#3b82f6"}
      onBlur={e => e.target.style.borderColor = "#e2e8f0"} />
  </div>;
}

function Sel({ label, value, onChange, options }) {
  return <div style={{ display: "flex", flexDirection: "column" }}>
    {label && <label style={lbl}>{label}</label>}
    <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inp, cursor: "pointer" }}>
      {options.map(o => typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  </div>;
}

function Section({ title, icon, open, onToggle, children }) {
  return <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: "8px" }}>
    <button onClick={onToggle} style={{ width: "100%", padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
      <span style={{ fontWeight: "700", fontSize: "13px", color: "#1e293b" }}>{icon} {title}</span>
      <span style={{ color: "#94a3b8", display: "inline-block", transform: open ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>▼</span>
    </button>
    {open && <div style={{ padding: "4px 16px 16px", borderTop: "1px solid #f1f5f9" }}>{children}</div>}
  </div>;
}

function G2({ children, gap = 8 }) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: `${gap}px`, marginTop: "10px" }}>{children}</div>;
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("builder");
  const [tpl, setTpl] = useState("modern");
  const [open, setOpen] = useState({ doc: true, biz: false, cust: false, items: true, notes: false });
  const [doc, setDoc] = useState(INIT_DOC);
  const [biz, setBiz] = useState(INIT_BIZ);
  const [cust, setCust] = useState(INIT_CUST);
  const [items, setItems] = useState([mkItem()]);
  const [savedDocs, setSavedDocs] = useState([]);
  const [savedCusts, setSavedCusts] = useState([]);
  const [showAI, setShowAI] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [custQ, setCustQ] = useState("");
  const [showCustDrop, setShowCustDrop] = useState(false);

  const totals = calcAll(items, doc.gst);
  const tog = key => setOpen(p => ({ ...p, [key]: !p[key] }));
  const updDoc = (f, v) => setDoc(p => ({ ...p, [f]: v }));
  const updBiz = (f, v) => setBiz(p => ({ ...p, [f]: v }));
  const updCust = (f, v) => setCust(p => ({ ...p, [f]: v }));
  const updItem = (id, f, v) => setItems(p => p.map(it => it.id === id ? { ...it, [f]: v } : it));
  const addItem = () => setItems(p => [...p, mkItem()]);
  const delItem = id => setItems(p => p.filter(it => it.id !== id));

  const saveDoc = () => {
    const d = { id: uid(), savedAt: new Date().toISOString(), doc: { ...doc }, biz: { ...biz }, cust: { ...cust }, items: [...items], tpl };
    setSavedDocs(p => [d, ...p.slice(0, 19)]);
    if (cust.name || cust.company) {
      if (!savedCusts.find(c => c.name === cust.name && c.company === cust.company))
        setSavedCusts(p => [{ ...cust }, ...p.slice(0, 49)]);
    }
    alert("✓ Saved!");
  };

  const loadDoc = d => { setDoc(d.doc); setBiz(d.biz); setCust(d.cust); setItems(d.items); setTpl(d.tpl || "modern"); setTab("builder"); };
  const delDoc = id => setSavedDocs(p => p.filter(x => x.id !== id));

  const newDoc = () => {
    setDoc({ ...INIT_DOC, num: `INV-${String(savedDocs.length + 2).padStart(3, "0")}`, date: toDay() });
    setCust(INIT_CUST); setItems([mkItem()]);
  };

  const handlePrint = () => window.print();

  const logoUpload = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = ev => updBiz("logo", ev.target.result);
    r.readAsDataURL(f);
  };

  const handleAI = async () => {
    if (!aiText.trim()) return;
    setAiLoading(true); setAiError("");
    try {
      const parsed = await aiParse(aiText);
      if (parsed?.length) {
        const newItems = parsed.map(p => ({ ...mkItem(), name: p.name || "", desc: p.desc || "", hsn: p.hsn || "", qty: String(p.qty || 1), unit: p.unit || "Pcs", price: String(p.price || 0), disc: String(p.disc || 0), tax: String(p.tax || 18) }));
        setItems(p => { const ex = p.filter(it => it.name); return ex.length ? [...ex, ...newItems] : newItems; });
        setShowAI(false); setAiText("");
      } else { setAiError("Could not parse items. Try a different format."); }
    } catch (e) { setAiError("Parse error. Please check your input and try again."); }
    setAiLoading(false);
  };

  const filtCusts = savedCusts.filter(c => !custQ || (c.name + c.company).toLowerCase().includes(custQ.toLowerCase())).slice(0, 6);

  const btn = (label, onClick, style = {}) =>
    <button onClick={onClick} style={{ border: "none", borderRadius: "8px", padding: "9px 16px", fontSize: "13px", fontWeight: "700", cursor: "pointer", ...style }}>{label}</button>;

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", fontFamily: "'Segoe UI',system-ui,sans-serif" }}>
      {/* Print styles */}
      <style>{`
        @media print {
          @page { size: A4; margin: 8mm; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          #ih-ui { display: none !important; }
          #ih-print { display: block !important; position: fixed; top: 0; left: 0; width: 100%; z-index: 9999; background: white; }
        }
        #ih-print { display: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
        input[type=number] { -moz-appearance: textfield; }
        input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>

      {/* Print area */}
      <div id="ih-print">
        <Invoice tpl={tpl} doc={doc} biz={biz} cust={cust} items={items} totals={totals} />
      </div>

      <div id="ih-ui">
        {/* ── Top Bar ── */}
        <div style={{ background: "#1e3a5f", color: "#fff", padding: "0 14px", display: "flex", alignItems: "center", justifyContent: "space-between", height: "54px", position: "sticky", top: 0, zIndex: 100, boxShadow: "0 2px 10px rgba(0,0,0,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ fontSize: "20px", fontWeight: "800", letterSpacing: "-0.5px" }}>
              <span style={{ color: "#f59e0b" }}>Invoice</span>Hub
            </div>
            <span style={{ fontSize: "9px", background: "rgba(245,158,11,0.2)", color: "#fbbf24", padding: "2px 7px", borderRadius: "20px", fontWeight: "700" }}>INDIA</span>
          </div>
          <div style={{ display: "flex", gap: "6px" }}>
            {btn("+ New", newDoc, { background: "rgba(255,255,255,0.1)", color: "#fff", padding: "6px 12px", fontSize: "12px" })}
            {btn("💾 Save", saveDoc, { background: "rgba(245,158,11,0.2)", color: "#fbbf24", padding: "6px 12px", fontSize: "12px" })}
            {btn("⬇ PDF", handlePrint, { background: "#f59e0b", color: "#fff", padding: "6px 14px", fontSize: "12px" })}
          </div>
        </div>

        {/* ── Tab Nav ── */}
        <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid #e2e8f0", position: "sticky", top: "54px", zIndex: 99 }}>
          {[["builder", "🔨 Builder"], ["preview", "👁 Preview"], ["saved", "📁 Saved"]].map(([t, l]) =>
            <button key={t} onClick={() => setTab(t)} style={{ flex: 1, padding: "12px 8px", fontSize: "12px", fontWeight: tab === t ? "700" : "500", color: tab === t ? "#1e3a5f" : "#64748b", borderBottom: tab === t ? "2px solid #1e3a5f" : "2px solid transparent", background: "none", border: "none", borderBottom: tab === t ? "2px solid #1e3a5f" : "2px solid transparent", cursor: "pointer", textAlign: "center" }}>{l}</button>
          )}
        </div>

        {/* ── Builder ── */}
        {tab === "builder" && <div style={{ padding: "12px 12px 80px" }}>

          {/* Template + AI row */}
          <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "12px 14px", marginBottom: "8px" }}>
            <div style={{ fontSize: "10px", fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>Template</div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {TPLS.map(t =>
                <button key={t.id} onClick={() => setTpl(t.id)} style={{ padding: "5px 12px", fontSize: "11px", borderRadius: "20px", border: "1px solid", borderColor: tpl === t.id ? "#1e3a5f" : "#e2e8f0", background: tpl === t.id ? "#1e3a5f" : "#fff", color: tpl === t.id ? "#fff" : "#475569", cursor: "pointer", fontWeight: tpl === t.id ? "700" : "400", transition: "all 0.15s" }}>{t.label}</button>
              )}
            </div>
          </div>

          <button onClick={() => setShowAI(true)} style={{ width: "100%", background: "linear-gradient(135deg,#1e3a5f,#1d4ed8)", color: "#fff", border: "none", borderRadius: "10px", padding: "11px", fontSize: "13px", fontWeight: "700", cursor: "pointer", marginBottom: "8px", display: "flex", alignItems: "center", justifyContent: "center", gap: "7px", boxShadow: "0 2px 10px rgba(29,78,216,0.25)" }}>
            ✨ AI Quick Entry — type items in plain text
          </button>

          {/* Doc Details */}
          <Section title="Document Details" icon="📄" open={open.doc} onToggle={() => tog("doc")}>
            <G2>
              <div style={{ gridColumn: "span 2" }}>
                <Sel label="Document Type" value={doc.type} onChange={v => updDoc("type", v)} options={DOC_TYPES} />
              </div>
              <Inp label="Document Number" value={doc.num} onChange={v => updDoc("num", v)} placeholder="INV-001" />
              <Inp label="Date" type="date" value={doc.date} onChange={v => updDoc("date", v)} />
              <Inp label="Due Date" type="date" value={doc.due} onChange={v => updDoc("due", v)} />
              <div />
            </G2>
            <div style={{ marginTop: "10px" }}>
              <label style={lbl}>GST Mode</label>
              <div style={{ display: "flex", gap: "6px" }}>
                {[["none", "No GST"], ["cgst_sgst", "CGST + SGST"], ["igst", "IGST"]].map(([v, l]) =>
                  <button key={v} onClick={() => updDoc("gst", v)} style={{ flex: 1, padding: "7px 8px", fontSize: "11px", borderRadius: "6px", border: "1px solid", borderColor: doc.gst === v ? "#1e3a5f" : "#e2e8f0", background: doc.gst === v ? "#1e3a5f" : "#fff", color: doc.gst === v ? "#fff" : "#475569", cursor: "pointer", fontWeight: doc.gst === v ? "700" : "400", transition: "all 0.15s" }}>{l}</button>
                )}
              </div>
            </div>
          </Section>

          {/* Business Profile */}
          <Section title="Your Business" icon="🏢" open={open.biz} onToggle={() => tog("biz")}>
            <G2>
              <div style={{ gridColumn: "span 2" }}><Inp label="Business Name" value={biz.name} onChange={v => updBiz("name", v)} placeholder="Sharma Traders Pvt Ltd" /></div>
              <Inp label="Owner Name" value={biz.owner} onChange={v => updBiz("owner", v)} placeholder="Ramesh Sharma" />
              <Inp label="GST Number" value={biz.gst} onChange={v => updBiz("gst", v)} placeholder="22AAAAA0000A1Z5" />
              <Inp label="PAN Number" value={biz.pan} onChange={v => updBiz("pan", v)} placeholder="AAAAA0000A" />
              <Inp label="Phone" value={biz.phone} onChange={v => updBiz("phone", v)} placeholder="+91 98765 43210" />
              <div style={{ gridColumn: "span 2" }}><Inp label="Email" value={biz.email} onChange={v => updBiz("email", v)} placeholder="info@business.com" /></div>
              <div style={{ gridColumn: "span 2" }}><Inp label="Address" value={biz.addr} onChange={v => updBiz("addr", v)} placeholder="123 Main Street, Area" /></div>
              <Inp label="City" value={biz.city} onChange={v => updBiz("city", v)} placeholder="Mumbai" />
              <Sel label="State" value={biz.state} onChange={v => updBiz("state", v)} options={IND_STATES} />
              <Inp label="Bank Account No." value={biz.bank} onChange={v => updBiz("bank", v)} placeholder="Account Number" />
              <Inp label="IFSC Code" value={biz.ifsc} onChange={v => updBiz("ifsc", v)} placeholder="HDFC0001234" />
              <div style={{ gridColumn: "span 2" }}><Inp label="UPI ID" value={biz.upi} onChange={v => updBiz("upi", v)} placeholder="business@ybl" /></div>
            </G2>
            <div style={{ marginTop: "10px" }}>
              <label style={lbl}>Business Logo</label>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
                {biz.logo && <img src={biz.logo} alt="logo" style={{ height: "40px", objectFit: "contain", borderRadius: "4px", border: "1px solid #e2e8f0" }} />}
                <label style={{ cursor: "pointer", background: "#f8fafc", border: "1px dashed #cbd5e1", borderRadius: "6px", padding: "8px 16px", fontSize: "12px", color: "#475569", fontWeight: "500" }}>
                  📁 Upload Logo
                  <input type="file" accept="image/*" onChange={logoUpload} style={{ display: "none" }} />
                </label>
                {biz.logo && <button onClick={() => updBiz("logo", null)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontSize: "12px", fontWeight: "600" }}>✕ Remove</button>}
              </div>
            </div>
          </Section>

          {/* Customer */}
          <Section title="Customer Details" icon="👤" open={open.cust} onToggle={() => tog("cust")}>
            {savedCusts.length > 0 && <div style={{ position: "relative", marginTop: "10px", marginBottom: "8px" }}>
              <input value={custQ} onChange={e => { setCustQ(e.target.value); setShowCustDrop(true); }}
                onFocus={() => setShowCustDrop(true)}
                placeholder="🔍 Search saved customers..."
                style={{ ...inp }}
                onFocus={e => { e.target.style.borderColor = "#3b82f6"; setShowCustDrop(true); }}
                onBlur={e => { e.target.style.borderColor = "#e2e8f0"; setTimeout(() => setShowCustDrop(false), 200); }}
              />
              {showCustDrop && filtCusts.length > 0 && <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 50, overflow: "hidden" }}>
                {filtCusts.map((c, i) => <button key={i} onMouseDown={() => { setCust(c); setCustQ(""); setShowCustDrop(false); }} style={{ width: "100%", padding: "8px 12px", textAlign: "left", background: "none", border: "none", borderBottom: "1px solid #f1f5f9", cursor: "pointer", fontSize: "12px" }}>
                  <strong>{c.name}</strong>{c.company && <span style={{ color: "#94a3b8" }}> · {c.company}</span>}
                </button>)}
              </div>}
            </div>}
            <G2>
              <Inp label="Customer Name" value={cust.name} onChange={v => updCust("name", v)} placeholder="Customer Name" />
              <Inp label="Company Name" value={cust.company} onChange={v => updCust("company", v)} placeholder="Company Pvt Ltd" />
              <Inp label="GST Number" value={cust.gst} onChange={v => updCust("gst", v)} placeholder="GSTIN" />
              <Inp label="Phone" value={cust.phone} onChange={v => updCust("phone", v)} placeholder="Phone" />
              <div style={{ gridColumn: "span 2" }}><Inp label="Email" value={cust.email} onChange={v => updCust("email", v)} placeholder="client@email.com" /></div>
              <div style={{ gridColumn: "span 2" }}><Inp label="Address" value={cust.addr} onChange={v => updCust("addr", v)} placeholder="Customer Address" /></div>
              <Inp label="City" value={cust.city} onChange={v => updCust("city", v)} placeholder="City" />
              <Sel label="State" value={cust.state} onChange={v => updCust("state", v)} options={["", ...IND_STATES]} />
            </G2>
          </Section>

          {/* Items */}
          <Section title={`Line Items (${items.filter(it => it.name).length})`} icon="📋" open={open.items} onToggle={() => tog("items")}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
              {items.map((it, idx) => {
                const c = calcLine(it);
                return <div key={it.id} style={{ background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", padding: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <span style={{ fontWeight: "700", fontSize: "12px", color: "#475569" }}>Item {idx + 1}</span>
                    {items.length > 1 && <button onClick={() => delItem(it.id)} style={{ background: "#fee2e2", border: "none", color: "#ef4444", borderRadius: "4px", padding: "3px 8px", fontSize: "11px", cursor: "pointer", fontWeight: "600" }}>✕ Remove</button>}
                  </div>
                  <G2 gap={6}>
                    <div style={{ gridColumn: "span 2" }}><Inp label="Item Name *" value={it.name} onChange={v => updItem(it.id, "name", v)} placeholder="Product / Service name" /></div>
                    <div style={{ gridColumn: "span 2" }}><Inp label="Description" value={it.desc} onChange={v => updItem(it.id, "desc", v)} placeholder="Optional details..." /></div>
                    <Inp label="HSN / SAC" value={it.hsn} onChange={v => updItem(it.id, "hsn", v)} placeholder="HSN Code" />
                    <Sel label="Unit" value={it.unit} onChange={v => updItem(it.id, "unit", v)} options={UNITS} />
                    <Inp label="Quantity" type="number" value={it.qty} onChange={v => updItem(it.id, "qty", v)} placeholder="1" />
                    <Inp label="Unit Price (₹)" type="number" value={it.price} onChange={v => updItem(it.id, "price", v)} placeholder="0.00" />
                    <Inp label="Discount %" type="number" value={it.disc} onChange={v => updItem(it.id, "disc", v)} placeholder="0" />
                    <Inp label="Tax %" type="number" value={it.tax} onChange={v => updItem(it.id, "tax", v)} placeholder="18" />
                  </G2>
                  {it.name && <div style={{ marginTop: "8px", textAlign: "right", fontSize: "13px", fontWeight: "700", color: "#1e3a5f", background: "#eff6ff", borderRadius: "6px", padding: "6px 10px" }}>
                    Taxable: {toINR(c.taxable)} · Tax: {toINR(c.taxAmt)} · <span style={{ color: "#1e40af" }}>Total: {toINR(c.total)}</span>
                  </div>}
                </div>;
              })}
              <button onClick={addItem} style={{ background: "#eff6ff", border: "1px dashed #93c5fd", borderRadius: "8px", padding: "11px", color: "#3b82f6", fontSize: "13px", fontWeight: "700", cursor: "pointer", textAlign: "center" }}>
                + Add Line Item
              </button>
            </div>
          </Section>

          {/* Notes */}
          <Section title="Notes & Terms" icon="📝" open={open.notes} onToggle={() => tog("notes")}>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
              <div>
                <label style={lbl}>Notes</label>
                <textarea value={doc.notes} onChange={e => updDoc("notes", e.target.value)} placeholder="Additional notes for the customer..." rows={3}
                  style={{ ...inp, resize: "vertical" }} />
              </div>
              <div>
                <label style={lbl}>Terms & Conditions</label>
                <textarea value={doc.terms} onChange={e => updDoc("terms", e.target.value)} rows={3}
                  style={{ ...inp, resize: "vertical" }} />
              </div>
            </div>
          </Section>

          {/* Summary Box */}
          <div style={{ background: "#1e3a5f", borderRadius: "10px", padding: "16px", color: "#fff" }}>
            <div style={{ fontSize: "12px", fontWeight: "700", marginBottom: "10px", color: "#f59e0b", textTransform: "uppercase", letterSpacing: "1px" }}>Invoice Summary</div>
            {[["Subtotal", toINR(totals.sub)], totals.disc > 0 && ["Discount", "-" + toINR(totals.disc)], doc.gst === "cgst_sgst" && totals.tax > 0 && ["CGST", toINR(totals.cgst)], doc.gst === "cgst_sgst" && totals.tax > 0 && ["SGST", toINR(totals.sgst)], doc.gst === "igst" && totals.tax > 0 && ["IGST", toINR(totals.igst)]].filter(Boolean).map(([l, v]) =>
              <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: "12px", color: "rgba(255,255,255,0.8)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}><span>{l}</span><span>{v}</span></div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", fontSize: "19px", fontWeight: "800", color: "#f59e0b" }}>
              <span>Grand Total</span><span>{toINR(totals.grand)}</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
            {btn("👁 Preview", () => setTab("preview"), { flex: 1, background: "#fff", color: "#1e3a5f", border: "1px solid #e2e8f0", padding: "12px" })}
            {btn("⬇ Download PDF", handlePrint, { flex: 2, background: "#1e3a5f", color: "#fff", padding: "12px" })}
          </div>
        </div>}

        {/* ── Preview ── */}
        {tab === "preview" && <div style={{ padding: "12px", background: "#e8edf2", minHeight: "calc(100vh - 108px)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
            <div style={{ fontSize: "12px", color: "#64748b", fontWeight: "600" }}>A4 Live Preview</div>
            <div style={{ display: "flex", gap: "6px" }}>
              {btn("← Edit", () => setTab("builder"), { background: "#fff", color: "#475569", border: "1px solid #e2e8f0", padding: "6px 12px", fontSize: "12px" })}
              {btn("⬇ PDF", handlePrint, { background: "#1e3a5f", color: "#fff", padding: "6px 14px", fontSize: "12px" })}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginBottom: "10px", flexWrap: "wrap" }}>
            {TPLS.map(t => <button key={t.id} onClick={() => setTpl(t.id)} style={{ padding: "4px 10px", fontSize: "10px", borderRadius: "20px", border: "1px solid", borderColor: tpl === t.id ? "#1e3a5f" : "#d1d5db", background: tpl === t.id ? "#1e3a5f" : "#fff", color: tpl === t.id ? "#fff" : "#6b7280", cursor: "pointer", fontWeight: tpl === t.id ? "700" : "400" }}>{t.label}</button>)}
          </div>
          <div style={{ background: "#fff", borderRadius: "4px", boxShadow: "0 4px 24px rgba(0,0,0,0.15)", overflow: "hidden", maxWidth: "794px", margin: "0 auto" }}>
            <Invoice tpl={tpl} doc={doc} biz={biz} cust={cust} items={items} totals={totals} />
          </div>
        </div>}

        {/* ── Saved ── */}
        {tab === "saved" && <div style={{ padding: "12px" }}>
          <div style={{ fontSize: "15px", fontWeight: "700", color: "#1e293b", marginBottom: "12px" }}>Saved Documents ({savedDocs.length})</div>
          {savedDocs.length === 0 ? <div style={{ textAlign: "center", padding: "60px 24px", color: "#94a3b8" }}>
            <div style={{ fontSize: "48px", marginBottom: "8px" }}>📄</div>
            <div style={{ fontSize: "14px", fontWeight: "600" }}>No saved documents yet</div>
            <div style={{ fontSize: "12px", marginTop: "4px" }}>Build an invoice and tap Save to store it here</div>
          </div> : savedDocs.map(d =>
            <div key={d.id} style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "14px 16px", marginBottom: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "700", fontSize: "14px", color: "#1e293b" }}>{d.doc.type} · <span style={{ color: "#3b82f6" }}>{d.doc.num}</span></div>
                  <div style={{ fontSize: "11px", color: "#64748b", marginTop: "2px" }}>
                    {d.cust.name || d.cust.company || "No customer"} · {d.doc.date}
                  </div>
                  <div style={{ fontSize: "15px", fontWeight: "800", color: "#1e3a5f", marginTop: "4px" }}>{toINR(calcAll(d.items, d.doc.gst).grand)}</div>
                </div>
                <div style={{ display: "flex", gap: "6px", marginLeft: "8px" }}>
                  {btn("Open", () => loadDoc(d), { background: "#eff6ff", color: "#2563eb", padding: "7px 12px", fontSize: "11px" })}
                  {btn("✕", () => delDoc(d.id), { background: "#fee2e2", color: "#ef4444", padding: "7px 10px", fontSize: "11px" })}
                </div>
              </div>
            </div>
          )}
        </div>}

        {/* ── AI Modal ── */}
        {showAI && <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={e => e.target === e.currentTarget && setShowAI(false)}>
          <div style={{ background: "#fff", width: "100%", maxWidth: "560px", borderRadius: "16px 16px 0 0", padding: "20px", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <div style={{ fontWeight: "800", fontSize: "16px", color: "#1e3a5f" }}>✨ AI Quick Entry</div>
              <button onClick={() => setShowAI(false)} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: "32px", height: "32px", cursor: "pointer", fontSize: "16px", color: "#64748b" }}>✕</button>
            </div>
            <div style={{ background: "#f8fafc", borderRadius: "8px", padding: "12px", marginBottom: "12px", fontSize: "12px", color: "#64748b", lineHeight: "1.7" }}>
              <strong style={{ color: "#1e3a5f" }}>Example:</strong><br />
              4 Solar Panels ₹15000 each<br />
              1 Inverter ₹25000 with 5% discount<br />
              Installation and commissioning ₹8000 no tax
            </div>
            <textarea value={aiText} onChange={e => setAiText(e.target.value)} placeholder="Type your items in plain English or Hindi..." rows={5}
              style={{ ...inp, resize: "vertical", marginBottom: "10px" }} />
            {aiError && <div style={{ background: "#fee2e2", color: "#ef4444", padding: "8px 12px", borderRadius: "6px", fontSize: "12px", marginBottom: "10px" }}>{aiError}</div>}
            <button onClick={handleAI} disabled={aiLoading || !aiText.trim()} style={{ width: "100%", background: aiLoading ? "#94a3b8" : "linear-gradient(135deg,#1e3a5f,#1d4ed8)", border: "none", borderRadius: "8px", padding: "13px", fontSize: "14px", fontWeight: "700", color: "#fff", cursor: aiLoading ? "not-allowed" : "pointer" }}>
              {aiLoading ? "⏳ AI is parsing your items..." : "✨ Convert to Invoice Items"}
            </button>
          </div>
        </div>}
      </div>
    </div>
  );
}
