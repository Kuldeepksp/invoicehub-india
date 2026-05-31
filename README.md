# InvoiceHub India — Launch Playbook

## Deploy in 15 minutes

```bash
# 1. Clone / copy this folder
npm install
npm run build   # verify it builds clean

# 2. Push to GitHub, connect to Vercel
# vercel.com → New Project → Import repo → Deploy
# That's it. Free Vercel tier handles 100GB bandwidth/month.

# 3. Custom domain
# Buy invoicehub.in on GoDaddy/Namecheap (~₹800/yr)
# Add in Vercel: Settings → Domains
```

---

## The 100-User Playbook (Week 1)

Your product is a free tool. The watermark on every PDF is your distribution engine.
Every invoice downloaded says "Generated using InvoiceHub India · invoicehub.in" — that's passive SEO and word-of-mouth.

### Day 1 — Seed (2 hours)

Post this exact message in each of these groups:

> "Built a free GST invoice generator for Indian freelancers/businesses.
> No signup, instant PDF, supports CGST/SGST/IGST.
> Try it: invoicehub.in
> Feedback welcome 🙏"

**Post to:**
- Facebook: "GST India Help", "Freelancers of India", "Indian Entrepreneurs & Startups", "CA India Network", "Small Business India"
- Reddit: r/India, r/IndiaInvestments, r/LegalAdviceIndia (answer invoice-related threads, mention tool)
- LinkedIn: Post to your network, tag 3-5 CA/freelancer connections
- WhatsApp: Your personal contacts who run businesses or freelance (20+ people)
- IndiaHacks / Product Hunt India / BetaPage

**Target: 40-60 users Day 1**

### Day 2-3 — Quora

Search Quora for:
- "how to make GST invoice India"
- "free invoice software India"
- "invoice format India freelancer"

Answer the question thoroughly, mention InvoiceHub as a tool you built.
Quora answers rank on Google within days for long-tail queries.

**Target: 10-20 more users**

### Day 4-7 — Double down on what worked

Check Google Search Console (add site immediately after deploy) to see which queries brought traffic.
Write 2-3 short blog posts targeting those queries:
- `/blog/gst-invoice-format-india` — "What fields are required in a GST invoice"
- `/blog/cgst-sgst-vs-igst` — "CGST vs SGST vs IGST: which to use"
- `/blog/proforma-invoice-india` — "Proforma invoice format India"

Each post ends with a CTA to use the generator.

**Target: 20-30 more users + SEO foundation for month 2**

---

## Monetization (Week 3+, after validation)

Only build this after you have 100+ users and understand what they actually want.

**Option A — Freemium (recommended)**
- Free: 5 invoices/month, 2 templates, InvoiceHub watermark
- Pro ₹199/month: Unlimited, all templates, remove watermark, custom domain branding
- Use Razorpay for payments (Indian-friendly, no stripe friction)

**Option B — AdSense**
- Apply to Google AdSense after 500+ monthly visits
- Place a single banner below the invoice form (non-intrusive)
- Expected: ₹0.50-1.50 per click from Indian traffic

**Option C — One-time purchase**
- ₹499 lifetime: custom branding, bulk invoice export
- Works well for CA firms and small businesses who hate subscriptions

---

## Tech Debt to Fix Before Monetization

In order of importance:
1. **Auth** — NextAuth.js + Google OAuth. 1-2 days. Needed for saved invoices across devices.
2. **Database** — Supabase (free tier). Store invoices per user. 1 day.
3. **Email capture** — Before auth, just a Tally form: "Get template updates". Build your list.
4. **Analytics** — Add Plausible.io (privacy-first, Indian users trust it more than GA4) Day 1.

Do NOT build admin panel, analytics dashboard, or bulk export until you have 500 paying users.
That is 3+ months away. Ship fast, listen to users.

---

## File Structure

```
invoicehub/
├── app/
│   ├── layout.tsx        ← SEO meta, structured data
│   ├── page.tsx          ← Landing page + embedded builder
│   └── globals.css       ← Tailwind + print styles
├── components/
│   └── InvoiceBuilder.tsx ← The full invoice builder
├── package.json
├── next.config.js
├── tailwind.config.ts
└── tsconfig.json
```

---

## Environment Variables (for future use)

```env
# .env.local — add these when you add auth/DB
NEXTAUTH_URL=https://invoicehub.in
NEXTAUTH_SECRET=your-secret-here
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
ANTHROPIC_API_KEY=xxx   # Move AI calls server-side for production
```

---

## Cost to Run (Month 1)

| Service | Cost |
|---------|------|
| Vercel (hobby) | Free |
| Supabase (free tier) | Free |
| Domain (invoicehub.in) | ~₹800/yr |
| Anthropic API (AI entry) | ~₹200-500/mo at 1000 users |
| **Total** | **< ₹1,500/month** |
