"use client";
import { useState } from "react";
import * as XLSX from "xlsx";

// ── Utilities ─────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 8);
const toDay = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; };
// round to 2 decimals safely (kills floating-point drift like 5499.999)
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const toINR = (n: any) => "₹" + r2(Number(n || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const toN = (n: any) => r2(Number(n || 0)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const calcLine = (it: any) => {
  const q = +it.qty || 0, p = +it.price || 0, d = +it.disc || 0, t = +it.tax || 0;
  const base = r2(q * p);
  const discAmt = r2(base * d / 100);
  const taxable = r2(base - discAmt);
  const taxAmt = r2(taxable * t / 100);
  const total = r2(taxable + taxAmt);
  return { base, discAmt, taxable, taxAmt, total };
};

const calcAll = (items: any[], gstMode: string) => {
  let sub = 0, disc = 0, taxable = 0, tax = 0;
  items.forEach((it: any) => {
    const c = calcLine(it);
    sub = r2(sub + c.base);
    disc = r2(disc + c.discAmt);
    taxable = r2(taxable + c.taxable);
    if (gstMode !== "none") tax = r2(tax + c.taxAmt);
  });
  const grand = r2(taxable + tax);
  return { sub, disc, taxable, tax, grand, cgst: gstMode === "cgst_sgst" ? r2(tax/2) : 0, sgst: gstMode === "cgst_sgst" ? r2(tax/2) : 0, igst: gstMode === "igst" ? tax : 0 };
};

// ── Constants ─────────────────────────────────────────────────────────────────
const DOC_TYPES = ["Tax Invoice","GST Invoice","Standard Invoice","Quotation","Estimate","Proforma Invoice","Purchase Order","Delivery Challan","Receipt","Payment Receipt","Service Invoice"];
const UNITS = ["Pcs","Nos","Kg","Gm","Ltr","Mtr","Ft","Hr","Day","Month","Set","Box","Pair"];
const IND_STATES = ["Andhra Pradesh","Arunachal Pradesh","Assam","Bihar","Chhattisgarh","Goa","Gujarat","Haryana","Himachal Pradesh","Jharkhand","Karnataka","Kerala","Madhya Pradesh","Maharashtra","Manipur","Meghalaya","Mizoram","Nagaland","Odisha","Punjab","Rajasthan","Sikkim","Tamil Nadu","Telangana","Tripura","Uttar Pradesh","Uttarakhand","West Bengal","Delhi","Puducherry","Chandigarh"];
const TPLS = [
  {id:"modern",label:"Modern"},
  {id:"minimal",label:"Minimal"},
  {id:"classic",label:"GST Classic"},
  {id:"warm",label:"Warm Indian"},
  {id:"mono",label:"Monochrome"},
  {id:"slate",label:"Slate"},
  {id:"teal",label:"Teal Pro"},
  {id:"compact",label:"Compact"},
  {id:"letter",label:"Letterhead"},
  {id:"exec",label:"Executive"},
];
const mkItem = () => ({ id: uid(), name: "", desc: "", hsn: "", qty: "1", unit: "Pcs", price: "", disc: "0", tax: "18" });
const INIT_BIZ = { name:"", owner:"", gst:"", pan:"", addr:"", city:"", state:"Maharashtra", country:"India", phone:"", email:"", web:"", bank:"", ifsc:"", upi:"", logo:null as string|null };
const INIT_CUST = { name:"", company:"", gst:"", addr:"", city:"", state:"", phone:"", email:"" };
const INIT_DOC = { type:"Tax Invoice", num:"INV-001", date:toDay(), due:"", gst:"cgst_sgst", notes:"", terms:"Thank you for your business." };

// shared helpers for templates
const addr = (o: any) => [o.addr, o.city, o.state].filter(Boolean).join(", ");
const FOOT = "Generated using InvoiceHub India · invoicehub.in";

// ── Template helper: builds rows consistently ──────────────────────────────────
function rows(items: any[], showGst: boolean) {
  return items.filter((it: any) => it.name).map((it: any) => ({ it, c: calcLine(it), amt: showGst ? calcLine(it).total : calcLine(it).taxable }));
}

// totals block, shared logic, styled per-template via props
function TotalsRows({ doc, totals }: any) {
  return <>
    {totals.disc > 0 && <Row l="Discount" v={"-" + toINR(totals.disc)} />}
    {doc.gst === "cgst_sgst" && totals.tax > 0 && <><Row l="CGST" v={toINR(totals.cgst)} /><Row l="SGST" v={toINR(totals.sgst)} /></>}
    {doc.gst === "igst" && totals.tax > 0 && <Row l="IGST" v={toINR(totals.igst)} />}
  </>;
}
function Row({ l, v }: any) {
  return <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0", fontSize:"11px", color:"#555", borderBottom:"1px solid #f1f1f1" }}><span>{l}</span><span>{v}</span></div>;
}

// ── 10 TEMPLATES ────────────────────────────────────────────────────────────────
// Each is a full A4 invoice. fs = base body font 11px. All GST-legal field sets.

function TplModern({ doc, biz, cust, items, totals }: any) {
  const N="#1e3a5f", A="#f59e0b", showGst=doc.gst!=="none", rs=rows(items,showGst);
  return <div style={{fontFamily:"'Segoe UI',Arial,sans-serif",fontSize:"11px",color:"#1e293b",background:"#fff"}}>
    <div style={{background:N,color:"#fff",padding:"20px 26px",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
      <div>{biz.logo && <img src={biz.logo} alt="" style={{height:"44px",marginBottom:"6px",display:"block"}}/>}
        <div style={{fontSize:"21px",fontWeight:"800"}}>{biz.name||"Your Business Name"}</div>
        {biz.gst && <div style={{fontSize:"8px",opacity:.8,marginTop:"2px"}}>GSTIN: {biz.gst}</div>}
        <div style={{fontSize:"8px",opacity:.75,marginTop:"2px",lineHeight:"1.6"}}>{addr(biz)}{biz.phone && <span> · {biz.phone}</span>}{biz.email && <span> · {biz.email}</span>}</div></div>
      <div style={{textAlign:"right"}}><div style={{fontSize:"26px",fontWeight:"900",textTransform:"uppercase",color:A}}>{doc.type}</div>
        <div style={{fontSize:"9px",marginTop:"6px",opacity:.9,lineHeight:"1.9"}}><div>No: <strong>{doc.num}</strong></div><div>Date: <strong>{doc.date}</strong></div>{doc.due && <div>Due: <strong>{doc.due}</strong></div>}</div></div>
    </div>
    <div style={{display:"flex",background:"#f8fafc",padding:"12px 26px",borderBottom:"1px solid #e2e8f0",gap:"16px"}}>
      <div style={{flex:1}}><div style={{fontSize:"7px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1.5px",color:"#94a3b8",marginBottom:"4px"}}>Bill To</div>
        <div style={{fontWeight:"700",fontSize:"12px"}}>{cust.name||cust.company||"Customer Name"}</div>
        {cust.company && cust.name && <div style={{fontSize:"9px",color:"#475569"}}>{cust.company}</div>}
        {cust.gst && <div style={{fontSize:"8px",color:"#475569"}}>GSTIN: {cust.gst}</div>}
        <div style={{fontSize:"8px",color:"#475569",marginTop:"2px"}}>{addr(cust)}{cust.phone && <span> · {cust.phone}</span>}</div></div>
      {(biz.bank||biz.upi) && <div style={{flex:1,borderLeft:"1px solid #e2e8f0",paddingLeft:"16px"}}><div style={{fontSize:"7px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1.5px",color:"#94a3b8",marginBottom:"4px"}}>Payment</div>
        <div style={{fontSize:"9px",color:"#475569",lineHeight:"1.8"}}>{biz.bank && <div>A/C: {biz.bank}</div>}{biz.ifsc && <div>IFSC: {biz.ifsc}</div>}{biz.upi && <div>UPI: {biz.upi}</div>}</div></div>}
    </div>
    <div style={{padding:"0 26px"}}><table style={{width:"100%",borderCollapse:"collapse",marginTop:"14px"}}>
      <thead><tr style={{background:N,color:"#fff"}}>
        <th style={{padding:"7px 5px",textAlign:"center",fontSize:"8px",fontWeight:"700",width:"22px"}}>#</th>
        <th style={{padding:"7px 5px",textAlign:"left",fontSize:"8px",fontWeight:"700"}}>ITEM</th>
        <th style={{padding:"7px 5px",textAlign:"center",fontSize:"8px",fontWeight:"700",width:"50px"}}>HSN</th>
        <th style={{padding:"7px 5px",textAlign:"center",fontSize:"8px",fontWeight:"700",width:"55px"}}>QTY</th>
        <th style={{padding:"7px 5px",textAlign:"right",fontSize:"8px",fontWeight:"700",width:"68px"}}>RATE</th>
        {showGst && <th style={{padding:"7px 5px",textAlign:"right",fontSize:"8px",fontWeight:"700",width:"44px"}}>GST%</th>}
        <th style={{padding:"7px 5px",textAlign:"right",fontSize:"8px",fontWeight:"700",width:"80px"}}>AMOUNT</th></tr></thead>
      <tbody>{rs.length?rs.map(({it,amt}:any,i:number)=>(<tr key={it.id} style={{background:i%2?"#f8fafc":"#fff",borderBottom:"1px solid #f1f5f9"}}>
        <td style={{padding:"7px 5px",textAlign:"center",fontSize:"9px",color:"#94a3b8"}}>{i+1}</td>
        <td style={{padding:"7px 5px"}}><div style={{fontWeight:"600",fontSize:"10px"}}>{it.name}</div>{it.desc && <div style={{fontSize:"8px",color:"#64748b"}}>{it.desc}</div>}</td>
        <td style={{padding:"7px 5px",textAlign:"center",fontSize:"8px",color:"#64748b"}}>{it.hsn}</td>
        <td style={{padding:"7px 5px",textAlign:"center",fontSize:"9px"}}>{it.qty} {it.unit}</td>
        <td style={{padding:"7px 5px",textAlign:"right",fontSize:"9px"}}>{toN(it.price)}</td>
        {showGst && <td style={{padding:"7px 5px",textAlign:"right",fontSize:"9px",color:"#64748b"}}>{it.tax}%</td>}
        <td style={{padding:"7px 5px",textAlign:"right",fontSize:"10px",fontWeight:"600"}}>{toN(amt)}</td></tr>)):
        <tr><td colSpan={showGst?7:6} style={{padding:"20px",textAlign:"center",color:"#94a3b8",fontSize:"10px"}}>No items added yet</td></tr>}</tbody></table></div>
    <div style={{display:"flex",justifyContent:"flex-end",padding:"10px 26px 16px"}}><div style={{width:"250px"}}>
      <TotalsRows doc={doc} totals={totals}/>
      <div style={{display:"flex",justifyContent:"space-between",padding:"10px 12px",background:N,color:"#fff",marginTop:"4px",borderRadius:"4px"}}><span style={{fontWeight:"700",fontSize:"11px",textTransform:"uppercase"}}>Grand Total</span><span style={{fontWeight:"800",fontSize:"14px",color:A}}>{toINR(totals.grand)}</span></div></div></div>
    {(doc.notes||doc.terms) && <div style={{display:"flex",gap:"16px",padding:"0 26px 16px",fontSize:"9px",color:"#475569"}}>
      {doc.notes && <div style={{flex:1}}><div style={{fontWeight:"700",textTransform:"uppercase",fontSize:"7px",color:N,marginBottom:"3px"}}>Notes</div>{doc.notes}</div>}
      {doc.terms && <div style={{flex:1}}><div style={{fontWeight:"700",textTransform:"uppercase",fontSize:"7px",color:N,marginBottom:"3px"}}>Terms</div>{doc.terms}</div>}</div>}
    <div style={{borderTop:"1px solid #e2e8f0",padding:"7px 26px",textAlign:"center",fontSize:"7px",color:"#94a3b8"}}>{FOOT}</div>
  </div>;
}

function TplMinimal({ doc, biz, cust, items, totals }: any) {
  const showGst=doc.gst!=="none", rs=rows(items,showGst);
  return <div style={{fontFamily:"Georgia,serif",fontSize:"11px",color:"#111",background:"#fff",padding:"36px 40px"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"36px"}}>
      <div>{biz.logo && <img src={biz.logo} alt="" style={{height:"36px",marginBottom:"8px",display:"block"}}/>}
        <div style={{fontSize:"22px",letterSpacing:"-1px"}}>{biz.name||"Business Name"}</div>
        <div style={{fontSize:"9px",color:"#999",marginTop:"4px",lineHeight:"1.7"}}>{addr(biz)}{biz.phone && <div>Tel: {biz.phone}</div>}{biz.email && <div>{biz.email}</div>}{biz.gst && <div>GSTIN: {biz.gst}</div>}</div></div>
      <div style={{textAlign:"right"}}><div style={{fontSize:"10px",letterSpacing:"5px",textTransform:"uppercase",color:"#bbb"}}>{doc.type}</div>
        <div style={{fontSize:"11px",color:"#888",marginTop:"10px",lineHeight:"1.9"}}>{doc.num}<br/>{doc.date}{doc.due && <><br/>Due {doc.due}</>}</div></div></div>
    <div style={{borderTop:"1px solid #ddd",borderBottom:"1px solid #ddd",padding:"14px 0",marginBottom:"30px"}}>
      <div style={{fontSize:"7px",letterSpacing:"3px",textTransform:"uppercase",color:"#bbb",marginBottom:"6px"}}>Invoice For</div>
      <div style={{fontSize:"14px"}}>{cust.name||cust.company||"Client Name"}</div>
      {cust.company && cust.name && <div style={{fontSize:"10px",color:"#666"}}>{cust.company}</div>}
      <div style={{fontSize:"9px",color:"#999",marginTop:"2px"}}>{addr(cust)}{cust.gst && <span> · GSTIN: {cust.gst}</span>}</div></div>
    <table style={{width:"100%",borderCollapse:"collapse",marginBottom:"30px"}}>
      <thead><tr style={{borderBottom:"1px solid #111"}}>
        <th style={{padding:"6px 0",textAlign:"left",fontSize:"7px",fontWeight:"normal",letterSpacing:"2.5px",textTransform:"uppercase",color:"#aaa"}}>Description</th>
        <th style={{padding:"6px 0",textAlign:"right",fontSize:"7px",fontWeight:"normal",letterSpacing:"2.5px",textTransform:"uppercase",color:"#aaa",width:"65px"}}>Qty</th>
        <th style={{padding:"6px 0",textAlign:"right",fontSize:"7px",fontWeight:"normal",letterSpacing:"2.5px",textTransform:"uppercase",color:"#aaa",width:"80px"}}>Rate ₹</th>
        <th style={{padding:"6px 0",textAlign:"right",fontSize:"7px",fontWeight:"normal",letterSpacing:"2.5px",textTransform:"uppercase",color:"#aaa",width:"80px"}}>Amount ₹</th></tr></thead>
      <tbody>{rs.length?rs.map(({it,amt}:any)=>(<tr key={it.id} style={{borderBottom:"1px solid #f4f4f4"}}>
        <td style={{padding:"10px 0"}}><div style={{fontSize:"11px"}}>{it.name}</div>{it.desc && <div style={{fontSize:"8px",color:"#999"}}>{it.desc}</div>}{it.hsn && <div style={{fontSize:"8px",color:"#ccc"}}>HSN: {it.hsn}</div>}{showGst && <div style={{fontSize:"8px",color:"#ccc"}}>GST {it.tax}%</div>}</td>
        <td style={{padding:"10px 0",textAlign:"right",fontSize:"10px",color:"#666"}}>{it.qty} {it.unit}</td>
        <td style={{padding:"10px 0",textAlign:"right",fontSize:"10px",color:"#666"}}>{toN(it.price)}</td>
        <td style={{padding:"10px 0",textAlign:"right",fontSize:"11px",fontWeight:"600"}}>{toN(amt)}</td></tr>)):
        <tr><td colSpan={4} style={{padding:"20px 0",textAlign:"center",color:"#ccc",fontSize:"10px"}}>No items added</td></tr>}</tbody></table>
    <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"28px"}}><div style={{width:"200px",fontSize:"10px"}}>
      <TotalsRows doc={doc} totals={totals}/>
      <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderTop:"1px solid #111",marginTop:"4px",fontSize:"13px"}}><span>Total Due</span><span style={{fontWeight:"700"}}>{toINR(totals.grand)}</span></div></div></div>
    {(biz.bank||biz.upi||doc.notes||doc.terms) && <div style={{borderTop:"1px solid #eee",paddingTop:"18px",display:"flex",gap:"24px",fontSize:"9px",color:"#888"}}>
      {(biz.bank||biz.upi) && <div style={{flex:1}}><div style={{fontSize:"7px",letterSpacing:"2px",textTransform:"uppercase",color:"#bbb",marginBottom:"4px"}}>Payment</div>{biz.bank && <div>A/C: {biz.bank}</div>}{biz.ifsc && <div>IFSC: {biz.ifsc}</div>}{biz.upi && <div>UPI: {biz.upi}</div>}</div>}
      {doc.notes && <div style={{flex:1}}><div style={{fontSize:"7px",letterSpacing:"2px",textTransform:"uppercase",color:"#bbb",marginBottom:"4px"}}>Notes</div>{doc.notes}</div>}
      {doc.terms && <div style={{flex:1}}><div style={{fontSize:"7px",letterSpacing:"2px",textTransform:"uppercase",color:"#bbb",marginBottom:"4px"}}>Terms</div>{doc.terms}</div>}</div>}
    <div style={{marginTop:"28px",textAlign:"center",fontSize:"7px",color:"#ddd",letterSpacing:"2px",textTransform:"uppercase"}}>{FOOT}</div>
  </div>;
}

function TplClassic({ doc, biz, cust, items, totals }: any) {
  const B="1px solid #000", showGst=doc.gst!=="none", rs=rows(items,showGst);
  return <div style={{fontFamily:"Arial,sans-serif",fontSize:"10px",color:"#000",background:"#fff",padding:"16px",border:"2px solid #000"}}>
    <div style={{textAlign:"center",borderBottom:B,padding:"8px",background:"#f0f0f0"}}><div style={{fontSize:"17px",fontWeight:"bold",textTransform:"uppercase",letterSpacing:"3px"}}>{doc.type}</div></div>
    <div style={{display:"flex",borderBottom:B}}>
      <div style={{flex:2,padding:"10px",borderRight:B}}>{biz.logo && <img src={biz.logo} alt="" style={{height:"34px",marginBottom:"4px",display:"block"}}/>}
        <div style={{fontWeight:"bold",fontSize:"13px"}}>{biz.name||"Business Name"}</div>
        <div style={{fontSize:"8px",marginTop:"3px",lineHeight:"1.6",color:"#333"}}>{biz.addr && <div>{biz.addr}</div>}{(biz.city||biz.state) && <div>{[biz.city,biz.state].filter(Boolean).join(", ")}</div>}{biz.phone && <div>Phone: {biz.phone}</div>}{biz.email && <div>Email: {biz.email}</div>}</div></div>
      <div style={{flex:1,padding:"10px"}}><table style={{fontSize:"9px",width:"100%"}}><tbody>
        {[["Invoice No",doc.num],["Date",doc.date],["Due Date",doc.due||"On Receipt"],["GSTIN",biz.gst||"—"],["PAN",biz.pan||"—"]].map(([l,v])=>
          <tr key={l}><td style={{padding:"2px 0",color:"#555",paddingRight:"6px",whiteSpace:"nowrap"}}>{l}:</td><td style={{fontWeight:"bold"}}>{v}</td></tr>)}</tbody></table></div></div>
    <div style={{display:"flex",borderBottom:B}}>
      <div style={{flex:1,padding:"8px",borderRight:(biz.bank||biz.upi)?B:"none"}}><div style={{fontSize:"7px",fontWeight:"bold",textTransform:"uppercase",color:"#555",marginBottom:"4px"}}>Bill To:</div>
        <div style={{fontWeight:"bold",fontSize:"11px"}}>{cust.name||"Customer Name"}</div>{cust.company && <div style={{fontSize:"9px"}}>{cust.company}</div>}{cust.gst && <div style={{fontSize:"8px"}}>GSTIN: {cust.gst}</div>}
        <div style={{fontSize:"8px",color:"#444",lineHeight:"1.5"}}>{cust.addr && <div>{cust.addr}</div>}{(cust.city||cust.state) && <div>{[cust.city,cust.state].filter(Boolean).join(", ")}</div>}{cust.phone && <div>Ph: {cust.phone}</div>}</div></div>
      {(biz.bank||biz.upi) && <div style={{flex:1,padding:"8px"}}><div style={{fontSize:"7px",fontWeight:"bold",textTransform:"uppercase",color:"#555",marginBottom:"4px"}}>Bank Details:</div>
        <div style={{fontSize:"8px",lineHeight:"1.8"}}>{biz.bank && <div><strong>A/C:</strong> {biz.bank}</div>}{biz.ifsc && <div><strong>IFSC:</strong> {biz.ifsc}</div>}{biz.upi && <div><strong>UPI:</strong> {biz.upi}</div>}</div></div>}</div>
    <table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr style={{background:"#f0f0f0"}}>
      <th style={{border:B,padding:"5px 4px",fontSize:"7px",fontWeight:"bold",width:"22px"}}>#</th>
      <th style={{border:B,padding:"5px 4px",fontSize:"7px",fontWeight:"bold",textAlign:"left"}}>DESCRIPTION</th>
      <th style={{border:B,padding:"5px 4px",fontSize:"7px",fontWeight:"bold",width:"48px"}}>HSN</th>
      <th style={{border:B,padding:"5px 4px",fontSize:"7px",fontWeight:"bold",width:"55px"}}>QTY</th>
      <th style={{border:B,padding:"5px 4px",fontSize:"7px",fontWeight:"bold",width:"68px"}}>RATE</th>
      {showGst && <th style={{border:B,padding:"5px 4px",fontSize:"7px",fontWeight:"bold",width:"40px"}}>TAX%</th>}
      {showGst && <th style={{border:B,padding:"5px 4px",fontSize:"7px",fontWeight:"bold",width:"72px"}}>TAXABLE</th>}
      <th style={{border:B,padding:"5px 4px",fontSize:"7px",fontWeight:"bold",width:"76px"}}>TOTAL</th></tr></thead>
      <tbody>{rs.length?rs.map(({it,c,amt}:any,i:number)=>(<tr key={it.id}>
        <td style={{border:B,padding:"5px 4px",textAlign:"center",fontSize:"8px"}}>{i+1}</td>
        <td style={{border:B,padding:"5px 4px"}}><div style={{fontWeight:"bold",fontSize:"9px"}}>{it.name}</div>{it.desc && <div style={{color:"#555",fontSize:"8px"}}>{it.desc}</div>}</td>
        <td style={{border:B,padding:"5px 4px",textAlign:"center",fontSize:"8px"}}>{it.hsn}</td>
        <td style={{border:B,padding:"5px 4px",textAlign:"center",fontSize:"8px"}}>{it.qty} {it.unit}</td>
        <td style={{border:B,padding:"5px 4px",textAlign:"right",fontSize:"8px"}}>{toN(it.price)}</td>
        {showGst && <td style={{border:B,padding:"5px 4px",textAlign:"right",fontSize:"8px"}}>{it.tax}%</td>}
        {showGst && <td style={{border:B,padding:"5px 4px",textAlign:"right",fontSize:"8px"}}>{toN(c.taxable)}</td>}
        <td style={{border:B,padding:"5px 4px",textAlign:"right",fontSize:"9px",fontWeight:"bold"}}>{toN(amt)}</td></tr>)):
        Array(3).fill(null).map((_,i)=>(<tr key={i}>{Array(showGst?8:6).fill(null).map((_,j)=><td key={j} style={{border:B,padding:"14px 4px"}}></td>)}</tr>))}</tbody></table>
    <div style={{display:"flex"}}>
      <div style={{flex:2,borderRight:B,borderLeft:B,borderBottom:B,padding:"8px",fontSize:"8px"}}>{doc.notes && <div style={{marginBottom:"6px"}}><strong>Notes: </strong>{doc.notes}</div>}{doc.terms && <div><strong>Terms: </strong>{doc.terms}</div>}
        <div style={{marginTop:"24px",paddingTop:"8px",borderTop:"1px dashed #ccc"}}><div style={{fontWeight:"bold",fontSize:"8px",marginBottom:"20px"}}>Authorised Signatory</div><div style={{fontSize:"8px",color:"#999"}}>{biz.name}</div></div></div>
      <div style={{flex:1}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:"9px"}}><tbody>
        {[["Subtotal",toINR(totals.sub)],...(totals.disc>0?[["Discount",`-${toINR(totals.disc)}`]]:[]),...(doc.gst==="cgst_sgst"&&totals.tax>0?[["CGST",toINR(totals.cgst)],["SGST",toINR(totals.sgst)]]:[]),...(doc.gst==="igst"&&totals.tax>0?[["IGST",toINR(totals.igst)]]:[])].map(([l,v]:any)=>
          <tr key={l}><td style={{padding:"5px 8px",borderRight:B,borderBottom:B,borderLeft:B}}>{l}</td><td style={{padding:"5px 8px",borderRight:B,borderBottom:B,textAlign:"right",color:l==="Discount"?"green":"inherit"}}>{v}</td></tr>)}
        <tr style={{background:"#f0f0f0"}}><td style={{padding:"7px 8px",fontWeight:"bold",fontSize:"10px",borderRight:B,borderBottom:B,borderLeft:B}}>Grand Total</td><td style={{padding:"7px 8px",fontWeight:"bold",fontSize:"11px",textAlign:"right",borderRight:B,borderBottom:B}}>{toINR(totals.grand)}</td></tr></tbody></table></div></div>
    <div style={{textAlign:"center",padding:"5px",fontSize:"7px",color:"#aaa",marginTop:"2px"}}>{FOOT}</div>
  </div>;
}

function TplWarm({ doc, biz, cust, items, totals }: any) {
  const showGst=doc.gst!=="none", rs=rows(items,showGst);
  return <div style={{fontFamily:"'Palatino Linotype',Palatino,serif",fontSize:"11px",color:"#2d1a00",background:"#fffdf8",border:"3px double #c97316"}}>
    <div style={{background:"linear-gradient(135deg,#7c2d12,#c2410c,#d97706)",color:"#fff",padding:"18px 24px",display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
      <div>{biz.logo && <img src={biz.logo} alt="" style={{height:"40px",marginBottom:"5px",display:"block",filter:"brightness(0) invert(1)"}}/>}
        <div style={{fontSize:"19px",fontWeight:"bold"}}>{biz.name||"व्यवसाय का नाम"}</div>{biz.gst && <div style={{fontSize:"8px",opacity:.8,marginTop:"2px"}}>GSTIN: {biz.gst}</div>}
        <div style={{fontSize:"8px",opacity:.75,marginTop:"1px"}}>{addr(biz)}{biz.phone && <span> · {biz.phone}</span>}</div></div>
      <div style={{textAlign:"right",background:"rgba(255,255,255,0.12)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:"6px",padding:"10px 14px"}}>
        <div style={{fontSize:"17px",fontWeight:"bold",textTransform:"uppercase"}}>{doc.type}</div>
        <div style={{fontSize:"8px",marginTop:"5px",opacity:.9,lineHeight:"1.9"}}><div>No: <strong>{doc.num}</strong></div><div>Date: <strong>{doc.date}</strong></div>{doc.due && <div>Due: <strong>{doc.due}</strong></div>}</div></div></div>
    <div style={{height:"3px",background:"linear-gradient(90deg,#c97316,#fbbf24,#c97316)"}}/>
    <div style={{padding:"12px 24px",background:"#fef3c7",borderBottom:"1px solid #fde68a",display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:"8px"}}>
      <div><div style={{fontSize:"7px",fontWeight:"bold",textTransform:"uppercase",letterSpacing:"1.5px",color:"#92400e",marginBottom:"4px"}}>Bill To</div>
        <div style={{fontWeight:"bold",fontSize:"12px",color:"#78350f"}}>{cust.name||cust.company||"Customer Name"}</div>{cust.company && cust.name && <div style={{fontSize:"9px",color:"#92400e"}}>{cust.company}</div>}{cust.gst && <div style={{fontSize:"8px",color:"#78350f"}}>GSTIN: {cust.gst}</div>}
        <div style={{fontSize:"8px",color:"#92400e"}}>{addr(cust)}</div></div>
      {(biz.bank||biz.upi) && <div style={{textAlign:"right"}}><div style={{fontSize:"7px",fontWeight:"bold",textTransform:"uppercase",letterSpacing:"1.5px",color:"#92400e",marginBottom:"4px"}}>Payment</div>
        <div style={{fontSize:"8px",color:"#78350f",lineHeight:"1.8"}}>{biz.bank && <div>A/C: {biz.bank}</div>}{biz.ifsc && <div>IFSC: {biz.ifsc}</div>}{biz.upi && <div>UPI: {biz.upi}</div>}</div></div>}</div>
    <div style={{padding:"0 24px"}}><table style={{width:"100%",borderCollapse:"collapse",marginTop:"12px"}}>
      <thead><tr style={{borderBottom:"2px solid #c97316"}}>
        <th style={{padding:"6px 4px",textAlign:"center",fontSize:"7px",fontWeight:"bold",color:"#92400e",width:"22px"}}>#</th>
        <th style={{padding:"6px 4px",textAlign:"left",fontSize:"7px",fontWeight:"bold",color:"#92400e"}}>ITEM</th>
        <th style={{padding:"6px 4px",textAlign:"center",fontSize:"7px",fontWeight:"bold",color:"#92400e",width:"55px"}}>QTY</th>
        <th style={{padding:"6px 4px",textAlign:"right",fontSize:"7px",fontWeight:"bold",color:"#92400e",width:"70px"}}>RATE</th>
        {showGst && <th style={{padding:"6px 4px",textAlign:"right",fontSize:"7px",fontWeight:"bold",color:"#92400e",width:"44px"}}>GST%</th>}
        <th style={{padding:"6px 4px",textAlign:"right",fontSize:"7px",fontWeight:"bold",color:"#92400e",width:"78px"}}>AMOUNT</th></tr></thead>
      <tbody>{rs.length?rs.map(({it,amt}:any,i:number)=>(<tr key={it.id} style={{borderBottom:"1px solid #fde68a",background:i%2?"rgba(254,243,199,0.5)":"transparent"}}>
        <td style={{padding:"8px 4px",textAlign:"center",fontSize:"8px",color:"#92400e"}}>{i+1}</td>
        <td style={{padding:"8px 4px"}}><div style={{fontWeight:"600",fontSize:"10px",color:"#451a03"}}>{it.name}</div>{it.desc && <div style={{fontSize:"8px",color:"#92400e"}}>{it.desc}</div>}</td>
        <td style={{padding:"8px 4px",textAlign:"center",fontSize:"8px"}}>{it.qty} {it.unit}</td>
        <td style={{padding:"8px 4px",textAlign:"right",fontSize:"9px"}}>{toN(it.price)}</td>
        {showGst && <td style={{padding:"8px 4px",textAlign:"right",fontSize:"8px",color:"#92400e"}}>{it.tax}%</td>}
        <td style={{padding:"8px 4px",textAlign:"right",fontSize:"10px",fontWeight:"bold",color:"#78350f"}}>{toN(amt)}</td></tr>)):
        <tr><td colSpan={showGst?6:5} style={{padding:"20px",textAlign:"center",color:"#c97316",fontSize:"10px",opacity:.5}}>No items added yet</td></tr>}</tbody></table></div>
    <div style={{display:"flex",justifyContent:"flex-end",padding:"10px 24px 14px"}}><div style={{width:"230px",background:"#fef3c7",borderRadius:"6px",padding:"10px 12px",border:"1px solid #fde68a",fontSize:"9px",color:"#92400e"}}>
      {totals.disc>0 && <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>Discount</span><span>-{toINR(totals.disc)}</span></div>}
      {doc.gst==="cgst_sgst"&&totals.tax>0 && <><div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>CGST</span><span>{toINR(totals.cgst)}</span></div><div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>SGST</span><span>{toINR(totals.sgst)}</span></div></>}
      {doc.gst==="igst"&&totals.tax>0 && <div style={{display:"flex",justifyContent:"space-between",padding:"3px 0"}}><span>IGST</span><span>{toINR(totals.igst)}</span></div>}
      <div style={{display:"flex",justifyContent:"space-between",padding:"9px 10px",background:"linear-gradient(135deg,#7c2d12,#d97706)",color:"#fff",borderRadius:"4px",marginTop:"8px",fontSize:"11px",fontWeight:"bold"}}><span>कुल राशि</span><span>{toINR(totals.grand)}</span></div></div></div>
    {(doc.notes||doc.terms) && <div style={{padding:"0 24px 14px",display:"flex",gap:"16px",fontSize:"8px",color:"#92400e"}}>{doc.notes && <div style={{flex:1}}><div style={{fontWeight:"bold",fontSize:"7px",textTransform:"uppercase",color:"#78350f",marginBottom:"3px"}}>Notes</div>{doc.notes}</div>}{doc.terms && <div style={{flex:1}}><div style={{fontWeight:"bold",fontSize:"7px",textTransform:"uppercase",color:"#78350f",marginBottom:"3px"}}>Terms</div>{doc.terms}</div>}</div>}
    <div style={{height:"3px",background:"linear-gradient(90deg,#c97316,#fbbf24,#c97316)"}}/>
    <div style={{textAlign:"center",padding:"6px",fontSize:"7px",color:"#c97316",background:"#fffbeb"}}>{FOOT}</div>
  </div>;
}

// generic clean template factory for the 6 new minimal styles
function GenericTpl({ doc, biz, cust, items, totals, accent, headerBg, headerColor, font, border }: any) {
  const showGst=doc.gst!=="none", rs=rows(items,showGst);
  return <div style={{fontFamily:font,fontSize:"11px",color:"#1a1a1a",background:"#fff",border:border||"none"}}>
    <div style={{background:headerBg,color:headerColor,padding:"22px 28px",display:"flex",justifyContent:"space-between",alignItems:"flex-start",borderBottom:`2px solid ${accent}`}}>
      <div>{biz.logo && <img src={biz.logo} alt="" style={{height:"42px",marginBottom:"6px",display:"block"}}/>}
        <div style={{fontSize:"20px",fontWeight:"700"}}>{biz.name||"Your Business Name"}</div>
        {biz.gst && <div style={{fontSize:"8px",opacity:.7,marginTop:"2px"}}>GSTIN: {biz.gst}</div>}
        <div style={{fontSize:"8px",opacity:.7,marginTop:"2px",lineHeight:"1.6"}}>{addr(biz)}{biz.phone && <span> · {biz.phone}</span>}{biz.email && <span> · {biz.email}</span>}</div></div>
      <div style={{textAlign:"right"}}><div style={{fontSize:"22px",fontWeight:"800",textTransform:"uppercase",letterSpacing:"1px",color:accent}}>{doc.type}</div>
        <div style={{fontSize:"9px",marginTop:"6px",opacity:.8,lineHeight:"1.9"}}><div>No: <strong>{doc.num}</strong></div><div>Date: <strong>{doc.date}</strong></div>{doc.due && <div>Due: <strong>{doc.due}</strong></div>}</div></div></div>
    <div style={{display:"flex",padding:"14px 28px",borderBottom:"1px solid #eee",gap:"20px"}}>
      <div style={{flex:1}}><div style={{fontSize:"7px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1.5px",color:"#999",marginBottom:"4px"}}>Bill To</div>
        <div style={{fontWeight:"700",fontSize:"12px"}}>{cust.name||cust.company||"Customer Name"}</div>{cust.company && cust.name && <div style={{fontSize:"9px",color:"#666"}}>{cust.company}</div>}{cust.gst && <div style={{fontSize:"8px",color:"#666"}}>GSTIN: {cust.gst}</div>}
        <div style={{fontSize:"8px",color:"#666",marginTop:"2px"}}>{addr(cust)}{cust.phone && <span> · {cust.phone}</span>}</div></div>
      {(biz.bank||biz.upi) && <div style={{flex:1,borderLeft:"1px solid #eee",paddingLeft:"20px"}}><div style={{fontSize:"7px",fontWeight:"700",textTransform:"uppercase",letterSpacing:"1.5px",color:"#999",marginBottom:"4px"}}>Payment</div>
        <div style={{fontSize:"9px",color:"#666",lineHeight:"1.8"}}>{biz.bank && <div>A/C: {biz.bank}</div>}{biz.ifsc && <div>IFSC: {biz.ifsc}</div>}{biz.upi && <div>UPI: {biz.upi}</div>}</div></div>}</div>
    <div style={{padding:"0 28px"}}><table style={{width:"100%",borderCollapse:"collapse",marginTop:"16px"}}>
      <thead><tr style={{borderBottom:`2px solid ${accent}`}}>
        <th style={{padding:"8px 5px",textAlign:"center",fontSize:"8px",fontWeight:"700",color:"#999",width:"22px"}}>#</th>
        <th style={{padding:"8px 5px",textAlign:"left",fontSize:"8px",fontWeight:"700",color:"#999"}}>ITEM</th>
        <th style={{padding:"8px 5px",textAlign:"center",fontSize:"8px",fontWeight:"700",color:"#999",width:"50px"}}>HSN</th>
        <th style={{padding:"8px 5px",textAlign:"center",fontSize:"8px",fontWeight:"700",color:"#999",width:"55px"}}>QTY</th>
        <th style={{padding:"8px 5px",textAlign:"right",fontSize:"8px",fontWeight:"700",color:"#999",width:"68px"}}>RATE</th>
        {showGst && <th style={{padding:"8px 5px",textAlign:"right",fontSize:"8px",fontWeight:"700",color:"#999",width:"44px"}}>GST%</th>}
        <th style={{padding:"8px 5px",textAlign:"right",fontSize:"8px",fontWeight:"700",color:"#999",width:"80px"}}>AMOUNT</th></tr></thead>
      <tbody>{rs.length?rs.map(({it,amt}:any,i:number)=>(<tr key={it.id} style={{borderBottom:"1px solid #f2f2f2"}}>
        <td style={{padding:"8px 5px",textAlign:"center",fontSize:"9px",color:"#bbb"}}>{i+1}</td>
        <td style={{padding:"8px 5px"}}><div style={{fontWeight:"600",fontSize:"10px"}}>{it.name}</div>{it.desc && <div style={{fontSize:"8px",color:"#888"}}>{it.desc}</div>}</td>
        <td style={{padding:"8px 5px",textAlign:"center",fontSize:"8px",color:"#888"}}>{it.hsn}</td>
        <td style={{padding:"8px 5px",textAlign:"center",fontSize:"9px"}}>{it.qty} {it.unit}</td>
        <td style={{padding:"8px 5px",textAlign:"right",fontSize:"9px"}}>{toN(it.price)}</td>
        {showGst && <td style={{padding:"8px 5px",textAlign:"right",fontSize:"9px",color:"#888"}}>{it.tax}%</td>}
        <td style={{padding:"8px 5px",textAlign:"right",fontSize:"10px",fontWeight:"600"}}>{toN(amt)}</td></tr>)):
        <tr><td colSpan={showGst?7:6} style={{padding:"20px",textAlign:"center",color:"#bbb",fontSize:"10px"}}>No items added yet</td></tr>}</tbody></table></div>
    <div style={{display:"flex",justifyContent:"flex-end",padding:"10px 28px 16px"}}><div style={{width:"250px"}}>
      <TotalsRows doc={doc} totals={totals}/>
      <div style={{display:"flex",justifyContent:"space-between",padding:"11px 14px",background:accent,color:"#fff",marginTop:"6px",borderRadius:"4px"}}><span style={{fontWeight:"700",fontSize:"11px",textTransform:"uppercase"}}>Grand Total</span><span style={{fontWeight:"800",fontSize:"14px"}}>{toINR(totals.grand)}</span></div></div></div>
    {(doc.notes||doc.terms) && <div style={{display:"flex",gap:"20px",padding:"0 28px 16px",fontSize:"9px",color:"#666"}}>{doc.notes && <div style={{flex:1}}><div style={{fontWeight:"700",textTransform:"uppercase",fontSize:"7px",color:accent,marginBottom:"3px"}}>Notes</div>{doc.notes}</div>}{doc.terms && <div style={{flex:1}}><div style={{fontWeight:"700",textTransform:"uppercase",fontSize:"7px",color:accent,marginBottom:"3px"}}>Terms</div>{doc.terms}</div>}</div>}
    <div style={{borderTop:"1px solid #eee",padding:"8px 28px",textAlign:"center",fontSize:"7px",color:"#bbb"}}>{FOOT}</div>
  </div>;
}

function Invoice({ tpl, ...props }: any) {
  switch(tpl){
    case "minimal": return <TplMinimal {...props}/>;
    case "classic": return <TplClassic {...props}/>;
    case "warm": return <TplWarm {...props}/>;
    case "mono": return <GenericTpl {...props} accent="#111" headerBg="#fff" headerColor="#111" font="'Helvetica Neue',Arial,sans-serif" border="1px solid #111"/>;
    case "slate": return <GenericTpl {...props} accent="#475569" headerBg="#f8fafc" headerColor="#1e293b" font="'Segoe UI',sans-serif"/>;
    case "teal": return <GenericTpl {...props} accent="#0d9488" headerBg="#f0fdfa" headerColor="#134e4a" font="'Segoe UI',sans-serif"/>;
    case "compact": return <GenericTpl {...props} accent="#1e3a5f" headerBg="#fff" headerColor="#1e293b" font="Arial,sans-serif"/>;
    case "letter": return <GenericTpl {...props} accent="#7c2d12" headerBg="#fdf6ec" headerColor="#1a1a1a" font="Georgia,serif" border="1px solid #e7d5b8"/>;
    case "exec": return <GenericTpl {...props} accent="#1d4ed8" headerBg="#0f172a" headerColor="#fff" font="'Segoe UI',sans-serif"/>;
    default: return <TplModern {...props}/>;
  }
}

// ── Excel Export (true .xlsx with borders, headers, totals) ─────────────────────
function exportExcel(doc: any, biz: any, cust: any, items: any[], totals: any) {
  const showGst = doc.gst !== "none";
  const rows: any[][] = [];

  rows.push([doc.type]);                                  // 0 title
  rows.push([]);                                          // 1 spacer
  rows.push(["From:", biz.name || ""]);                  // 2
  rows.push(["GSTIN:", biz.gst || ""]);                  // 3
  rows.push(["PAN:", biz.pan || ""]);                    // 4
  rows.push(["Address:", addr(biz)]);                    // 5
  rows.push(["Phone:", biz.phone || "", "Email:", biz.email || ""]); // 6
  rows.push([]);                                         // 7
  rows.push(["Bill To:", cust.name || cust.company || ""]); // 8
  rows.push(["Company:", cust.company || ""]);           // 9
  rows.push(["Customer GSTIN:", cust.gst || ""]);        // 10
  rows.push(["Address:", addr(cust)]);                   // 11
  rows.push(["Phone:", cust.phone || ""]);               // 12
  rows.push([]);                                         // 13
  rows.push(["Invoice No:", doc.num, "Date:", doc.date, ...(doc.due ? ["Due:", doc.due] : [])]); // 14
  rows.push([]);                                         // 15

  const head = ["#","Item","Description","HSN/SAC","Qty","Unit","Rate","Disc %","Taxable", ...(showGst?["GST %","Tax Amt"]:[]), "Total"];
  const headRowIdx = rows.length;
  rows.push(head);

  const dataStart = rows.length;
  items.filter((it:any)=>it.name).forEach((it:any,i:number)=>{
    const c = calcLine(it);
    const amt = showGst ? c.total : c.taxable;
    rows.push([i+1, it.name, it.desc||"", it.hsn||"", +it.qty||0, it.unit, r2(+it.price||0), +it.disc||0, c.taxable, ...(showGst?[+it.tax||0, c.taxAmt]:[]), amt]);
  });
  const dataEnd = rows.length - 1;

  rows.push([]);
  const totalsStart = rows.length;
  const lastCol = head.length - 1;
  const pushTotal = (label: string, val: number) => {
    const row = new Array(head.length).fill("");
    row[lastCol-1] = label; row[lastCol] = val;
    rows.push(row);
  };
  pushTotal("Subtotal", totals.sub);
  if (totals.disc>0) pushTotal("Discount", -totals.disc);
  if (doc.gst==="cgst_sgst" && totals.tax>0){ pushTotal("CGST", totals.cgst); pushTotal("SGST", totals.sgst); }
  if (doc.gst==="igst" && totals.tax>0) pushTotal("IGST", totals.igst);
  pushTotal("GRAND TOTAL", totals.grand);
  const grandRowIdx = rows.length - 1;

  rows.push([]);
  if (doc.notes) rows.push(["Notes:", doc.notes]);
  if (doc.terms) rows.push(["Terms:", doc.terms]);
  rows.push([]);
  rows.push([FOOT]);

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Column widths
  ws["!cols"] = [
    {wch:6},{wch:26},{wch:24},{wch:12},{wch:8},{wch:8},{wch:12},{wch:8},{wch:14},
    ...(showGst?[{wch:8},{wch:12}]:[]),{wch:14}
  ];

  // Merge the title across all columns
  ws["!merges"] = [{ s:{r:0,c:0}, e:{r:0,c:lastCol} }];

  // Style helpers
  const thin = { style:"thin", color:{rgb:"FF999999"} };
  const border = { top:thin, bottom:thin, left:thin, right:thin };
  const range = XLSX.utils.decode_range(ws["!ref"] as string);

  for (let R=range.s.r; R<=range.e.r; R++){
    for (let C=range.s.c; C<=range.e.c; C++){
      const ref = XLSX.utils.encode_cell({r:R,c:C});
      if (!ws[ref]) continue;
      const cell: any = ws[ref];
      cell.s = cell.s || {};

      // Title
      if (R===0){ cell.s = { font:{bold:true,sz:18,color:{rgb:"FF1E3A5F"}}, alignment:{horizontal:"center"} }; }
      // Header row of items table
      else if (R===headRowIdx){ cell.s = { font:{bold:true,color:{rgb:"FFFFFFFF"}}, fill:{fgColor:{rgb:"FF1E3A5F"}}, alignment:{horizontal:"center"}, border }; }
      // Item data rows -> borders + number formats
      else if (R>=dataStart && R<=dataEnd){
        cell.s = { border, alignment:{ horizontal: (C===0||C===4||C===5)?"center":(C>=6?"right":"left") } };
        if (C===6 || C===8 || C===lastCol || (showGst && C===10)) cell.z = '#,##0.00';
      }
      // Totals block
      else if (R>=totalsStart && R<=grandRowIdx){
        if (C===lastCol-1) cell.s = { font:{bold:R===grandRowIdx}, alignment:{horizontal:"right"} };
        if (C===lastCol){ cell.s = { font:{bold:R===grandRowIdx, color:{rgb: R===grandRowIdx ? "FFF59E0B":"FF000000"}}, alignment:{horizontal:"right"}, fill: R===grandRowIdx?{fgColor:{rgb:"FF1E3A5F"}}:undefined }; cell.z = '#,##0.00'; }
      }
      // Label cells (From/Bill To etc)
      else if (C===0 && typeof cell.v === "string" && cell.v.endsWith(":")){ cell.s = { font:{bold:true,color:{rgb:"FF64748B"}} }; }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Invoice");
  XLSX.writeFile(wb, `${doc.num || "invoice"}.xlsx`);
}

// ── UI Atoms ──────────────────────────────────────────────────────────────────
const inp: any = { border:"1px solid #e2e8f0", borderRadius:"6px", padding:"8px 10px", fontSize:"14px", color:"#1e293b", outline:"none", background:"#fff", width:"100%", boxSizing:"border-box", fontFamily:"inherit" };
const lbl: any = { fontSize:"11px", fontWeight:"600", color:"#64748b", textTransform:"uppercase", letterSpacing:"0.5px", display:"block", marginBottom:"4px" };

function Inp({ label, value, onChange, type="text", placeholder="" }: any) {
  return <div style={{ display:"flex", flexDirection:"column" }}>
    {label && <label style={lbl}>{label}</label>}
    <input type={type} value={value} onChange={(e: any) => onChange(e.target.value)} placeholder={placeholder}
      style={inp} onFocus={(e: any) => e.target.style.borderColor="#3b82f6"} onBlur={(e: any) => e.target.style.borderColor="#e2e8f0"} />
  </div>;
}
function Sel({ label, value, onChange, options }: any) {
  return <div style={{ display:"flex", flexDirection:"column" }}>
    {label && <label style={lbl}>{label}</label>}
    <select value={value} onChange={(e: any) => onChange(e.target.value)} style={{ ...inp, cursor:"pointer" }}>
      {options.map((o: any) => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>;
}
function Section({ title, icon, open, onToggle, children }: any) {
  return <div style={{ background:"#fff", borderRadius:"10px", border:"1px solid #e2e8f0", overflow:"hidden", marginBottom:"8px" }}>
    <button onClick={onToggle} style={{ width:"100%", padding:"14px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", background:"none", border:"none", cursor:"pointer", textAlign:"left" }}>
      <span style={{ fontWeight:"700", fontSize:"14px", color:"#1e293b" }}>{icon} {title}</span>
      <span style={{ color:"#94a3b8", display:"inline-block", transform: open?"rotate(180deg)":"none", transition:"transform 0.2s" }}>▼</span>
    </button>
    {open && <div style={{ padding:"4px 16px 16px", borderTop:"1px solid #f1f5f9" }}>{children}</div>}
  </div>;
}

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("builder");
  const [tpl, setTpl] = useState("modern");
  const [open, setOpen] = useState({ doc:true, biz:false, cust:false, items:true, notes:false });
  const [doc, setDoc] = useState(INIT_DOC);
  const [biz, setBiz] = useState(INIT_BIZ);
  const [cust, setCust] = useState(INIT_CUST);
  const [items, setItems] = useState([mkItem()]);
  const [savedDocs, setSavedDocs] = useState<any[]>([]);
  const [savedCusts, setSavedCusts] = useState<any[]>([]);
  const [custQ, setCustQ] = useState("");
  const [showCustDrop, setShowCustDrop] = useState(false);

  const totals = calcAll(items, doc.gst);
  const showGst = doc.gst !== "none";
  const tog = (k: string) => setOpen((p: any) => ({ ...p, [k]: !p[k] }));
  const updDoc = (f: string, v: any) => setDoc((p: any) => ({ ...p, [f]: v }));
  const updBiz = (f: string, v: any) => setBiz((p: any) => ({ ...p, [f]: v }));
  const updCust = (f: string, v: any) => setCust((p: any) => ({ ...p, [f]: v }));
  const updItem = (id: string, f: string, v: any) => setItems((p: any) => p.map((it: any) => it.id===id?{...it,[f]:v}:it));
  const addItem = () => setItems((p: any) => [...p, mkItem()]);
  const delItem = (id: string) => setItems((p: any) => p.filter((it: any) => it.id!==id));

  const saveDoc = () => {
    const d = { id: uid(), savedAt:new Date().toISOString(), doc:{...doc}, biz:{...biz}, cust:{...cust}, items:[...items], tpl };
    setSavedDocs((p: any) => [d, ...p.slice(0,19)]);
    if (cust.name || cust.company) { if (!savedCusts.find((c: any)=>c.name===cust.name&&c.company===cust.company)) setSavedCusts((p: any)=>[{...cust},...p.slice(0,49)]); }
    alert("✓ Invoice saved!");
  };
  const loadDoc = (d: any) => { setDoc(d.doc); setBiz(d.biz); setCust(d.cust); setItems(d.items); setTpl(d.tpl||"modern"); setTab("builder"); };
  const delDoc = (id: string) => setSavedDocs((p: any) => p.filter((x: any)=>x.id!==id));
  const newDoc = () => { setDoc({...INIT_DOC, num:`INV-${String(savedDocs.length+2).padStart(3,"0")}`, date:toDay()}); setCust(INIT_CUST); setItems([mkItem()]); };
  const handlePrint = () => window.print();
  const handleExcel = () => exportExcel(doc, biz, cust, items, totals);
  const logoUpload = (e: any) => { const f=e.target.files[0]; if(!f)return; const r=new FileReader(); r.onload=(ev: any)=>updBiz("logo",ev.target.result); r.readAsDataURL(f); };
  const filtCusts = savedCusts.filter((c: any)=>!custQ||(c.name+c.company).toLowerCase().includes(custQ.toLowerCase())).slice(0,6);

  return (
    <div style={{ minHeight:"100vh", background:"#f1f5f9", fontFamily:"'Segoe UI',system-ui,sans-serif" }}>
      <style>{`
        @media print {
          @page { size: A4; margin: 8mm; }
          #ih-app { display: none !important; }
          #ih-print { display: block !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
        #ih-print { display:none; }
        input::placeholder, textarea::placeholder { color:#b8c4ce !important; }
        ::-webkit-scrollbar { width:4px; height:4px; }
        ::-webkit-scrollbar-thumb { background:#cbd5e1; border-radius:2px; }
        input[type=number]::-webkit-outer-spin-button, input[type=number]::-webkit-inner-spin-button { -webkit-appearance:none; }
        input[type=number] { -moz-appearance:textfield; }
        .ih-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px; }
        .ih-span2 { grid-column:span 2; }
        @media (max-width:520px){
          .ih-grid { grid-template-columns:1fr !important; }
          .ih-span2 { grid-column:span 1 !important; }
          .ih-topbar-btn { padding:5px 8px !important; font-size:11px !important; }
        }
      `}</style>

      {/* Print area — only this prints */}
      <div id="ih-print"><Invoice tpl={tpl} doc={doc} biz={biz} cust={cust} items={items} totals={totals}/></div>

      <div id="ih-app">

      {/* Top Bar */}
      <div style={{ background:"#1e3a5f", color:"#fff", padding:"0 14px", display:"flex", alignItems:"center", justifyContent:"space-between", height:"54px", position:"sticky", top:0, zIndex:100, boxShadow:"0 2px 10px rgba(0,0,0,0.2)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          <div style={{ fontSize:"20px", fontWeight:"800" }}><span style={{ color:"#f59e0b" }}>Invoice</span>Hub</div>
          <span style={{ fontSize:"9px", background:"rgba(245,158,11,0.2)", color:"#fbbf24", padding:"2px 7px", borderRadius:"20px", fontWeight:"700" }}>INDIA</span>
        </div>
        <div style={{ display:"flex", gap:"6px" }}>
          <button onClick={newDoc} className="ih-topbar-btn" style={{ border:"none", borderRadius:"8px", padding:"7px 12px", fontSize:"12px", fontWeight:"700", cursor:"pointer", background:"rgba(255,255,255,0.1)", color:"#fff" }}>+ New</button>
          <button onClick={saveDoc} className="ih-topbar-btn" style={{ border:"none", borderRadius:"8px", padding:"7px 12px", fontSize:"12px", fontWeight:"700", cursor:"pointer", background:"rgba(245,158,11,0.2)", color:"#fbbf24" }}>💾 Save</button>
          <button onClick={handleExcel} className="ih-topbar-btn" style={{ border:"none", borderRadius:"8px", padding:"7px 12px", fontSize:"12px", fontWeight:"700", cursor:"pointer", background:"#16a34a", color:"#fff" }}>⬇ Excel</button>
          <button onClick={handlePrint} className="ih-topbar-btn" style={{ border:"none", borderRadius:"8px", padding:"7px 14px", fontSize:"12px", fontWeight:"700", cursor:"pointer", background:"#f59e0b", color:"#fff" }}>⬇ PDF</button>
        </div>
      </div>

      {/* Tab Nav */}
      <div style={{ display:"flex", background:"#fff", borderBottom:"1px solid #e2e8f0", position:"sticky", top:"54px", zIndex:99 }}>
        {[["builder","🔨 Builder"],["preview","👁 Preview"],["saved","📁 Saved"]].map(([t,l]) =>
          <button key={t} onClick={()=>setTab(t)} style={{ flex:1, padding:"13px 8px", fontSize:"13px", fontWeight: tab===t?"700":"500", color: tab===t?"#1e3a5f":"#64748b", background:"none", border:"none", borderBottom: tab===t?"2px solid #1e3a5f":"2px solid transparent", cursor:"pointer" }}>{l}</button>)}
      </div>

      {/* ── Builder ── */}
      {tab==="builder" && <div style={{ padding:"12px 12px 80px" }}>
        <div style={{ background:"#fff", borderRadius:"10px", border:"1px solid #e2e8f0", padding:"12px 14px", marginBottom:"8px" }}>
          <div style={{ fontSize:"11px", fontWeight:"700", color:"#64748b", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"8px" }}>Template ({TPLS.length} styles)</div>
          <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
            {TPLS.map((t: any) => <button key={t.id} onClick={()=>setTpl(t.id)} style={{ padding:"6px 13px", fontSize:"12px", borderRadius:"20px", border:"1px solid", borderColor: tpl===t.id?"#1e3a5f":"#e2e8f0", background: tpl===t.id?"#1e3a5f":"#fff", color: tpl===t.id?"#fff":"#475569", cursor:"pointer", fontWeight: tpl===t.id?"700":"400" }}>{t.label}</button>)}
          </div>
        </div>

        <Section title="Document Details" icon="📄" open={open.doc} onToggle={()=>tog("doc")}>
          <div className="ih-grid">
            <div className="ih-span2"><Sel label="Document Type" value={doc.type} onChange={(v:any)=>updDoc("type",v)} options={DOC_TYPES}/></div>
            <Inp label="Document Number" value={doc.num} onChange={(v:any)=>updDoc("num",v)} placeholder="INV-001"/>
            <Inp label="Date" type="date" value={doc.date} onChange={(v:any)=>updDoc("date",v)}/>
            <Inp label="Due Date (optional)" type="date" value={doc.due} onChange={(v:any)=>updDoc("due",v)}/>
            <div/>
          </div>
          <div style={{ marginTop:"12px" }}>
            <label style={lbl}>GST Mode</label>
            <div style={{ display:"flex", gap:"6px", flexWrap:"wrap" }}>
              {[["none","No GST"],["cgst_sgst","CGST + SGST"],["igst","IGST"]].map(([v,l]) =>
                <button key={v} onClick={()=>updDoc("gst",v)} style={{ flex:1, minWidth:"90px", padding:"8px", fontSize:"12px", borderRadius:"6px", border:"1px solid", borderColor: doc.gst===v?"#1e3a5f":"#e2e8f0", background: doc.gst===v?"#1e3a5f":"#fff", color: doc.gst===v?"#fff":"#475569", cursor:"pointer", fontWeight: doc.gst===v?"700":"400" }}>{l}</button>)}
            </div>
            {!showGst && <div style={{ marginTop:"8px", background:"#fef9c3", borderRadius:"6px", padding:"8px 12px", fontSize:"12px", color:"#854d0e" }}>⚠ No GST mode — tax columns will not appear on the invoice.</div>}
          </div>
        </Section>

        <Section title="Your Business" icon="🏢" open={open.biz} onToggle={()=>tog("biz")}>
          <div className="ih-grid">
            <div className="ih-span2"><Inp label="Business Name" value={biz.name} onChange={(v:any)=>updBiz("name",v)} placeholder="e.g. Sharma Traders Pvt Ltd"/></div>
            <Inp label="Owner / Contact Name" value={biz.owner} onChange={(v:any)=>updBiz("owner",v)} placeholder="e.g. Ramesh Sharma"/>
            <Inp label="GST Number (GSTIN)" value={biz.gst} onChange={(v:any)=>updBiz("gst",v)} placeholder="e.g. 22AAAAA0000A1Z5"/>
            <Inp label="PAN Number" value={biz.pan} onChange={(v:any)=>updBiz("pan",v)} placeholder="e.g. AAAAA0000A"/>
            <Inp label="Phone Number" value={biz.phone} onChange={(v:any)=>updBiz("phone",v)} placeholder="e.g. +91 98765 43210"/>
            <div className="ih-span2"><Inp label="Email Address" value={biz.email} onChange={(v:any)=>updBiz("email",v)} placeholder="e.g. info@yourbusiness.com"/></div>
            <div className="ih-span2"><Inp label="Street Address" value={biz.addr} onChange={(v:any)=>updBiz("addr",v)} placeholder="e.g. 123 Main Street, Area Name"/></div>
            <Inp label="City" value={biz.city} onChange={(v:any)=>updBiz("city",v)} placeholder="e.g. Mumbai"/>
            <Sel label="State" value={biz.state} onChange={(v:any)=>updBiz("state",v)} options={IND_STATES}/>
            <Inp label="Bank Account Number" value={biz.bank} onChange={(v:any)=>updBiz("bank",v)} placeholder="Your account number"/>
            <Inp label="IFSC Code" value={biz.ifsc} onChange={(v:any)=>updBiz("ifsc",v)} placeholder="e.g. HDFC0001234"/>
            <div className="ih-span2"><Inp label="UPI ID" value={biz.upi} onChange={(v:any)=>updBiz("upi",v)} placeholder="e.g. business@ybl"/></div>
          </div>
          <div style={{ marginTop:"12px" }}>
            <label style={lbl}>Business Logo</label>
            <div style={{ display:"flex", alignItems:"center", gap:"12px", flexWrap:"wrap" }}>
              {biz.logo && <img src={biz.logo} alt="logo" style={{ height:"40px", objectFit:"contain", borderRadius:"4px", border:"1px solid #e2e8f0" }}/>}
              <label style={{ cursor:"pointer", background:"#f8fafc", border:"1px dashed #cbd5e1", borderRadius:"6px", padding:"9px 16px", fontSize:"13px", color:"#475569", fontWeight:"500" }}>📁 Upload Logo<input type="file" accept="image/*" onChange={logoUpload} style={{ display:"none" }}/></label>
              {biz.logo && <button onClick={()=>updBiz("logo",null)} style={{ background:"none", border:"none", color:"#ef4444", cursor:"pointer", fontSize:"12px", fontWeight:"600" }}>✕ Remove</button>}
            </div>
          </div>
        </Section>

        <Section title="Customer Details" icon="👤" open={open.cust} onToggle={()=>tog("cust")}>
          {savedCusts.length>0 && <div style={{ position:"relative", marginTop:"10px", marginBottom:"8px" }}>
            <input value={custQ} onChange={(e:any)=>{setCustQ(e.target.value);setShowCustDrop(true);}} onFocus={()=>setShowCustDrop(true)} placeholder="🔍 Search saved customers..." style={inp} onBlur={()=>setTimeout(()=>setShowCustDrop(false),200)}/>
            {showCustDrop && filtCusts.length>0 && <div style={{ position:"absolute", top:"100%", left:0, right:0, background:"#fff", border:"1px solid #e2e8f0", borderRadius:"6px", boxShadow:"0 4px 12px rgba(0,0,0,0.1)", zIndex:50, overflow:"hidden" }}>
              {filtCusts.map((c:any,i:number)=><button key={i} onMouseDown={()=>{setCust(c);setCustQ("");setShowCustDrop(false);}} style={{ width:"100%", padding:"10px 12px", textAlign:"left", background:"none", border:"none", borderBottom:"1px solid #f1f5f9", cursor:"pointer", fontSize:"13px" }}><strong>{c.name}</strong>{c.company && <span style={{ color:"#94a3b8" }}> · {c.company}</span>}</button>)}
            </div>}
          </div>}
          <div className="ih-grid">
            <Inp label="Customer / Client Name" value={cust.name} onChange={(v:any)=>updCust("name",v)} placeholder="e.g. Priya Sharma"/>
            <Inp label="Company Name (optional)" value={cust.company} onChange={(v:any)=>updCust("company",v)} placeholder="e.g. ABC Pvt Ltd"/>
            <Inp label="Customer GSTIN (optional)" value={cust.gst} onChange={(v:any)=>updCust("gst",v)} placeholder="e.g. 27BBBBB1234B1Z1"/>
            <Inp label="Phone Number" value={cust.phone} onChange={(v:any)=>updCust("phone",v)} placeholder="e.g. +91 99999 00000"/>
            <div className="ih-span2"><Inp label="Email Address (optional)" value={cust.email} onChange={(v:any)=>updCust("email",v)} placeholder="e.g. client@company.com"/></div>
            <div className="ih-span2"><Inp label="Billing Address" value={cust.addr} onChange={(v:any)=>updCust("addr",v)} placeholder="e.g. 456 Park Street"/></div>
            <Inp label="City" value={cust.city} onChange={(v:any)=>updCust("city",v)} placeholder="e.g. Delhi"/>
            <Sel label="State" value={cust.state} onChange={(v:any)=>updCust("state",v)} options={["-- Select State --",...IND_STATES]}/>
          </div>
        </Section>

        <Section title={`Line Items (${items.filter((it:any)=>it.name).length} added)`} icon="📋" open={open.items} onToggle={()=>tog("items")}>
          <div style={{ display:"flex", flexDirection:"column", gap:"10px", marginTop:"8px" }}>
            {items.map((it:any,idx:number)=>{ const c=calcLine(it); return <div key={it.id} style={{ background:"#f8fafc", borderRadius:"8px", border:"1px solid #e2e8f0", padding:"12px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}><span style={{ fontWeight:"700", fontSize:"13px", color:"#475569" }}>Item {idx+1}</span>{items.length>1 && <button onClick={()=>delItem(it.id)} style={{ background:"#fee2e2", border:"none", color:"#ef4444", borderRadius:"4px", padding:"4px 10px", fontSize:"12px", cursor:"pointer", fontWeight:"600" }}>✕ Remove</button>}</div>
              <div className="ih-grid">
                <div className="ih-span2"><Inp label="Item Name *" value={it.name} onChange={(v:any)=>updItem(it.id,"name",v)} placeholder="e.g. Web Design Service"/></div>
                <div className="ih-span2"><Inp label="Description (optional)" value={it.desc} onChange={(v:any)=>updItem(it.id,"desc",v)} placeholder="e.g. Logo + homepage"/></div>
                <Inp label="HSN / SAC Code" value={it.hsn} onChange={(v:any)=>updItem(it.id,"hsn",v)} placeholder="e.g. 998314"/>
                <Sel label="Unit" value={it.unit} onChange={(v:any)=>updItem(it.id,"unit",v)} options={UNITS}/>
                <Inp label="Quantity" type="number" value={it.qty} onChange={(v:any)=>updItem(it.id,"qty",v)} placeholder="1"/>
                <Inp label="Unit Price (₹)" type="number" value={it.price} onChange={(v:any)=>updItem(it.id,"price",v)} placeholder="0.00"/>
                {showGst && <Inp label="Discount %" type="number" value={it.disc} onChange={(v:any)=>updItem(it.id,"disc",v)} placeholder="0"/>}
                {showGst && <Inp label="GST %" type="number" value={it.tax} onChange={(v:any)=>updItem(it.id,"tax",v)} placeholder="18"/>}
              </div>
              {it.name && it.price && <div style={{ marginTop:"8px", textAlign:"right", fontSize:"13px", fontWeight:"700", color:"#1e3a5f", background:"#eff6ff", borderRadius:"6px", padding:"7px 12px" }}>{showGst ? <>Taxable: {toINR(c.taxable)} · Tax: {toINR(c.taxAmt)} · <span style={{ color:"#1e40af" }}>Total: {toINR(c.total)}</span></> : <>Amount: <span style={{ color:"#1e40af" }}>{toINR(c.taxable)}</span></>}</div>}
            </div>; })}
            <button onClick={addItem} style={{ background:"#eff6ff", border:"1px dashed #93c5fd", borderRadius:"8px", padding:"12px", color:"#3b82f6", fontSize:"14px", fontWeight:"700", cursor:"pointer" }}>+ Add Another Item</button>
          </div>
        </Section>

        <Section title="Notes & Terms" icon="📝" open={open.notes} onToggle={()=>tog("notes")}>
          <div style={{ display:"flex", flexDirection:"column", gap:"10px", marginTop:"10px" }}>
            <div><label style={lbl}>Notes for Customer</label><textarea value={doc.notes} onChange={(e:any)=>updDoc("notes",e.target.value)} placeholder="e.g. Payment due within 15 days. Thank you!" rows={3} style={{ ...inp, resize:"vertical" }}/></div>
            <div><label style={lbl}>Terms & Conditions</label><textarea value={doc.terms} onChange={(e:any)=>updDoc("terms",e.target.value)} rows={3} style={{ ...inp, resize:"vertical" }}/></div>
          </div>
        </Section>

        <div style={{ background:"#1e3a5f", borderRadius:"10px", padding:"16px", color:"#fff" }}>
          <div style={{ fontSize:"11px", fontWeight:"700", marginBottom:"12px", color:"#f59e0b", textTransform:"uppercase", letterSpacing:"1px" }}>Invoice Summary</div>
          <div style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:"13px", color:"rgba(255,255,255,0.75)", borderBottom:"1px solid rgba(255,255,255,0.08)" }}><span>Subtotal</span><span>{toINR(totals.sub)}</span></div>
          {totals.disc>0 && <div style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:"13px", color:"#4ade80", borderBottom:"1px solid rgba(255,255,255,0.08)" }}><span>Discount</span><span>-{toINR(totals.disc)}</span></div>}
          {doc.gst==="cgst_sgst"&&totals.tax>0 && <><div style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:"13px", color:"rgba(255,255,255,0.75)", borderBottom:"1px solid rgba(255,255,255,0.08)" }}><span>CGST</span><span>{toINR(totals.cgst)}</span></div><div style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:"13px", color:"rgba(255,255,255,0.75)", borderBottom:"1px solid rgba(255,255,255,0.08)" }}><span>SGST</span><span>{toINR(totals.sgst)}</span></div></>}
          {doc.gst==="igst"&&totals.tax>0 && <div style={{ display:"flex", justifyContent:"space-between", padding:"5px 0", fontSize:"13px", color:"rgba(255,255,255,0.75)", borderBottom:"1px solid rgba(255,255,255,0.08)" }}><span>IGST</span><span>{toINR(totals.igst)}</span></div>}
          {doc.gst==="none" && <div style={{ padding:"5px 0", fontSize:"12px", color:"rgba(255,255,255,0.5)" }}>No GST applied</div>}
          <div style={{ display:"flex", justifyContent:"space-between", padding:"12px 0 0", fontSize:"20px", fontWeight:"800", color:"#f59e0b" }}><span>Grand Total</span><span>{toINR(totals.grand)}</span></div>
        </div>

        <div style={{ display:"flex", gap:"8px", marginTop:"10px" }}>
          <button onClick={()=>setTab("preview")} style={{ flex:1, border:"1px solid #e2e8f0", borderRadius:"8px", padding:"13px", fontSize:"14px", fontWeight:"700", cursor:"pointer", background:"#fff", color:"#1e3a5f" }}>👁 Preview</button>
          <button onClick={handleExcel} style={{ flex:1, border:"none", borderRadius:"8px", padding:"13px", fontSize:"14px", fontWeight:"700", cursor:"pointer", background:"#16a34a", color:"#fff" }}>⬇ Excel</button>
          <button onClick={handlePrint} style={{ flex:1, border:"none", borderRadius:"8px", padding:"13px", fontSize:"14px", fontWeight:"700", cursor:"pointer", background:"#1e3a5f", color:"#fff" }}>⬇ PDF</button>
        </div>
      </div>}

      {/* ── Preview ── */}
      {tab==="preview" && <div style={{ padding:"12px", background:"#e8edf2", minHeight:"calc(100vh - 108px)" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"10px" }}>
          <div style={{ fontSize:"12px", color:"#64748b", fontWeight:"600" }}>Live Preview</div>
          <div style={{ display:"flex", gap:"6px" }}>
            <button onClick={()=>setTab("builder")} style={{ background:"#fff", color:"#475569", border:"1px solid #e2e8f0", borderRadius:"8px", padding:"6px 12px", fontSize:"12px", fontWeight:"600", cursor:"pointer" }}>← Edit</button>
            <button onClick={handleExcel} style={{ background:"#16a34a", color:"#fff", border:"none", borderRadius:"8px", padding:"6px 12px", fontSize:"12px", fontWeight:"600", cursor:"pointer" }}>⬇ Excel</button>
            <button onClick={handlePrint} style={{ background:"#1e3a5f", color:"#fff", border:"none", borderRadius:"8px", padding:"6px 14px", fontSize:"12px", fontWeight:"600", cursor:"pointer" }}>⬇ PDF</button>
          </div>
        </div>
        <div style={{ display:"flex", justifyContent:"center", gap:"6px", marginBottom:"10px", flexWrap:"wrap" }}>
          {TPLS.map((t:any)=><button key={t.id} onClick={()=>setTpl(t.id)} style={{ padding:"4px 11px", fontSize:"11px", borderRadius:"20px", border:"1px solid", borderColor: tpl===t.id?"#1e3a5f":"#d1d5db", background: tpl===t.id?"#1e3a5f":"#fff", color: tpl===t.id?"#fff":"#6b7280", cursor:"pointer", fontWeight: tpl===t.id?"700":"400" }}>{t.label}</button>)}
        </div>
        <div style={{ overflowX:"auto" }}>
          <div style={{ background:"#fff", borderRadius:"4px", boxShadow:"0 4px 24px rgba(0,0,0,0.15)", overflow:"hidden", maxWidth:"794px", margin:"0 auto", minWidth:"320px" }}>
            <Invoice tpl={tpl} doc={doc} biz={biz} cust={cust} items={items} totals={totals}/>
          </div>
        </div>
      </div>}

      {/* ── Saved ── */}
      {tab==="saved" && <div style={{ padding:"12px" }}>
        <div style={{ fontSize:"16px", fontWeight:"700", color:"#1e293b", marginBottom:"12px" }}>Saved Documents ({savedDocs.length})</div>
        <div style={{ background:"#fef3c7", borderRadius:"8px", padding:"10px 12px", fontSize:"12px", color:"#854d0e", marginBottom:"12px" }}>⚠ Documents are saved in this browser session only. They will be lost if you close or refresh the page. Download PDF or Excel to keep a permanent copy.</div>
        {savedDocs.length===0
          ? <div style={{ textAlign:"center", padding:"60px 24px", color:"#94a3b8" }}><div style={{ fontSize:"48px", marginBottom:"8px" }}>📄</div><div style={{ fontSize:"14px", fontWeight:"600" }}>No saved documents yet</div><div style={{ fontSize:"12px", marginTop:"4px" }}>Build an invoice and tap Save</div></div>
          : savedDocs.map((d:any)=><div key={d.id} style={{ background:"#fff", borderRadius:"10px", border:"1px solid #e2e8f0", padding:"14px 16px", marginBottom:"8px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
                <div style={{ flex:1 }}><div style={{ fontWeight:"700", fontSize:"14px", color:"#1e293b" }}>{d.doc.type} · <span style={{ color:"#3b82f6" }}>{d.doc.num}</span></div>
                  <div style={{ fontSize:"12px", color:"#64748b", marginTop:"2px" }}>{d.cust.name||d.cust.company||"No customer"} · {d.doc.date}</div>
                  <div style={{ fontSize:"16px", fontWeight:"800", color:"#1e3a5f", marginTop:"4px" }}>{toINR(calcAll(d.items,d.doc.gst).grand)}</div></div>
                <div style={{ display:"flex", gap:"6px", marginLeft:"8px" }}>
                  <button onClick={()=>loadDoc(d)} style={{ background:"#eff6ff", color:"#2563eb", border:"none", borderRadius:"6px", padding:"7px 12px", fontSize:"12px", fontWeight:"600", cursor:"pointer" }}>Open</button>
                  <button onClick={()=>delDoc(d.id)} style={{ background:"#fee2e2", color:"#ef4444", border:"none", borderRadius:"6px", padding:"7px 10px", fontSize:"12px", fontWeight:"600", cursor:"pointer" }}>✕</button>
                </div>
              </div>
            </div>)}
      </div>}
      </div>
    </div>
  );
}
