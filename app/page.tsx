"use client";

import InvoiceBuilder from "@/components/InvoiceBuilder";

// ── SEO content that lives below the fold ──────────────────────────────────
const FAQ = [
  {
    q: "Is InvoiceHub India completely free?",
    a: "Yes. Create, download, and print unlimited invoices for free. No signup, no credit card, no hidden charges.",
  },
  {
    q: "Does it support GST (CGST, SGST, IGST)?",
    a: "Yes. Choose between No GST, CGST + SGST (for intra-state supply), or IGST (for inter-state supply). Tax is calculated automatically on each line item.",
  },
  {
    q: "Which document types can I create?",
    a: "Tax Invoice, GST Invoice, Standard Invoice, Quotation, Estimate, Proforma Invoice, Purchase Order, Delivery Challan, Receipt, Payment Receipt, and Service Invoice.",
  },
  {
    q: "Can I add my business logo?",
    a: "Yes. Upload your logo from the 'Your Business' section and it will appear on all your invoices.",
  },
  {
    q: "How do I download the invoice as PDF?",
    a: "Click the 'PDF' button — your browser's print dialog opens, then choose 'Save as PDF'. You can also export a fully formatted Excel file using the 'Excel' button.",
  },
  {
    q: "Is my data saved?",
    a: "Your data is saved locally in your browser session. Use the Save button to store documents within the app. No data is uploaded to any server.",
  },
];

const FEATURES = [
  { icon: "⚡", title: "Fast Invoicing", desc: "Fill in your details once and generate professional invoices in under a minute. Add unlimited line items with automatic GST calculation." },
  { icon: "🇮🇳", title: "Built for India", desc: "GST-compliant with CGST/SGST/IGST modes, HSN/SAC codes, Indian state selector, and INR formatting." },
  { icon: "🎨", title: "10 Professional Templates", desc: "Ten minimal, GST-compliant designs — Modern, Minimal, Classic, Warm Indian, Monochrome, Slate, Teal, Compact, Letterhead, and Executive. Switch with one click." },
  { icon: "📄", title: "Instant PDF Download", desc: "Print-ready A4 format. No watermark on your business details — just the InvoiceHub footer." },
  { icon: "🔒", title: "Privacy First", desc: "Your data never leaves your browser. No account required, no cloud storage, no tracking." },
  { icon: "📊", title: "Excel & PDF Export", desc: "Download your invoice as a print-ready PDF or a fully formatted Excel spreadsheet with one click." },
];

export default function Home() {
  return (
    <>
      {/* ── Main UI (hidden on print) ── */}
      <div id="page-ui">
        {/* ── Hero ── */}
        <header style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #0f2341 100%)", color: "#fff", padding: "32px 20px 24px", textAlign: "center" }}>
          <div style={{ maxWidth: "760px", margin: "0 auto" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
              <span style={{ fontSize: "28px", fontWeight: "900", letterSpacing: "-1px" }}>
                <span style={{ color: "#f59e0b" }}>Invoice</span>Hub
              </span>
              <span style={{ background: "rgba(245,158,11,0.2)", color: "#fbbf24", padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "700" }}>INDIA</span>
            </div>
            <h1 style={{ fontSize: "clamp(22px, 5vw, 34px)", fontWeight: "800", lineHeight: "1.2", marginBottom: "12px", letterSpacing: "-0.5px" }}>
              Free GST Invoice Generator<br />
              <span style={{ color: "#f59e0b" }}>for Indian Businesses</span>
            </h1>
            <p style={{ fontSize: "15px", color: "rgba(255,255,255,0.75)", maxWidth: "520px", margin: "0 auto 16px", lineHeight: "1.6" }}>
              Create professional Tax Invoices, Quotations &amp; Purchase Orders with CGST/SGST/IGST support. Download PDF instantly — no signup required.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
              {["✓ 100% Free", "✓ GST Compliant", "✓ No Signup", "✓ PDF Download"].map(t =>
                <span key={t} style={{ background: "rgba(255,255,255,0.1)", padding: "5px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "600" }}>{t}</span>
              )}
            </div>
          </div>
        </header>

        {/* ── Invoice Builder (the actual product) ── */}
        <main>
          <InvoiceBuilder />
        </main>

        {/* ── Features ── (SEO content below the fold) */}
        <section style={{ background: "#fff", padding: "48px 20px" }}>
          <div style={{ maxWidth: "960px", margin: "0 auto" }}>
            <h2 style={{ textAlign: "center", fontSize: "clamp(18px, 4vw, 26px)", fontWeight: "800", color: "#0f172a", marginBottom: "32px" }}>
              Everything you need to invoice professionally
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "20px" }}>
              {FEATURES.map(f =>
                <div key={f.title} style={{ padding: "20px", borderRadius: "12px", border: "1px solid #f1f5f9", background: "#fafafa" }}>
                  <div style={{ fontSize: "28px", marginBottom: "8px" }}>{f.icon}</div>
                  <div style={{ fontWeight: "700", fontSize: "15px", color: "#1e293b", marginBottom: "6px" }}>{f.title}</div>
                  <div style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.6" }}>{f.desc}</div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── FAQ (rich snippets for Google) ── */}
        <section style={{ background: "#f8fafc", padding: "48px 20px" }}>
          <div style={{ maxWidth: "720px", margin: "0 auto" }}>
            <h2 style={{ textAlign: "center", fontSize: "clamp(18px, 4vw, 26px)", fontWeight: "800", color: "#0f172a", marginBottom: "32px" }}>
              Frequently Asked Questions
            </h2>
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{
                __html: JSON.stringify({
                  "@context": "https://schema.org",
                  "@type": "FAQPage",
                  mainEntity: FAQ.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
                }),
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {FAQ.map(f =>
                <details key={f.q} style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "16px 18px" }}>
                  <summary style={{ fontWeight: "700", fontSize: "14px", color: "#1e293b", cursor: "pointer", listStyle: "none" }}>
                    {f.q}
                  </summary>
                  <p style={{ marginTop: "10px", fontSize: "13px", color: "#475569", lineHeight: "1.7" }}>{f.a}</p>
                </details>
              )}
            </div>
          </div>
        </section>

        {/* ── SEO text block ── */}
        <section style={{ background: "#fff", padding: "40px 20px", borderTop: "1px solid #f1f5f9" }}>
          <div style={{ maxWidth: "720px", margin: "0 auto" }}>
            <h2 style={{ fontSize: "20px", fontWeight: "800", color: "#0f172a", marginBottom: "12px" }}>
              The easiest free invoice generator for India
            </h2>
            <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.8", marginBottom: "12px" }}>
              InvoiceHub India is built specifically for Indian freelancers, consultants, small businesses, and sole proprietors who need a quick, professional way to create GST-compliant invoices without expensive software subscriptions.
            </p>
            <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.8", marginBottom: "12px" }}>
              Whether you need a <strong>Tax Invoice</strong> with full CGST and SGST breakdown, an <strong>IGST invoice</strong> for inter-state transactions, a <strong>Proforma Invoice</strong> for advance payments, or a simple <strong>Quotation</strong> for your clients — InvoiceHub handles all of it with the correct format required under Indian GST law.
            </p>
            <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.8" }}>
              Your business data stays in your browser. Download as many PDFs as you need. Free, forever.
            </p>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer style={{ background: "#1e3a5f", color: "rgba(255,255,255,0.6)", padding: "24px 20px", textAlign: "center", fontSize: "12px" }}>
          <div style={{ marginBottom: "8px" }}>
            <span style={{ color: "#fff", fontWeight: "700" }}>InvoiceHub India</span>
            {" · "}Free GST Invoice Generator for Indian Businesses
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: "16px", flexWrap: "wrap" }}>
            <span>Tax Invoice</span><span>·</span>
            <span>GST Invoice</span><span>·</span>
            <span>Quotation</span><span>·</span>
            <span>Proforma Invoice</span><span>·</span>
            <span>Purchase Order</span>
          </div>
        </footer>
      </div>
    </>
  );
}
