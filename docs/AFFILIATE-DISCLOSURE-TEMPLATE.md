# Affiliate Disclosure Templates
**trafico.live** | Certus SPV, SLU | Prepared: 2026-04-17

Compliant with: Spain LSSI-CE Art. 20 (commercial communications identification), FTC 16 CFR Part 255 (endorsement guides), EU Directive 2005/29/EC (unfair commercial practices). All three templates work together — use the short one sitewide, inline where relevant, and long on the legal page.

---

## Template 1 — Short Footer Strip

**Use case:** Global site footer, every page. Single line.

### Spanish (primary)
```html
<p class="text-sm text-tl-muted">
  Algunos enlaces de esta página pueden ser de afiliado. Si reservas a través de ellos, podemos recibir una comisión sin coste adicional para ti.
  <a href="/aviso-legal#afiliados" class="underline">Más información</a>.
</p>
```

**Plain text version:**
> Algunos enlaces de esta página pueden ser de afiliado. Si reservas a través de ellos, podemos recibir una comisión sin coste adicional para ti. [Más información](/aviso-legal#afiliados).

### English (international visitors)
```html
<p class="text-sm text-tl-muted">
  Some links on this page are affiliate links. If you book through them, we may earn a commission at no extra cost to you.
  <a href="/aviso-legal#afiliados" class="underline">Learn more</a>.
</p>
```

**Placement note:** Add to `src/app/layout.tsx` footer section, always visible, not hidden behind a toggle.

---

## Template 2 — Medium Inline Disclosure

**Use case:** Inline on specific pages or sections that contain affiliate links (e.g., `/trenes`, `/aviacion`, `/maritimo` booking CTAs, `/gasolineras` fuel price comparison).

### Spanish (primary)
```html
<aside class="text-xs text-tl-muted border-l-2 border-tl-amber-400 pl-3 my-4">
  <strong>Aviso de afiliación:</strong> Los enlaces de reserva de esta sección son de afiliado.
  trafico.live puede recibir una comisión por reservas completadas, sin repercusión en el precio que pagas.
  Nuestra cobertura editorial es independiente de estos acuerdos.
</aside>
```

**Plain text version:**
> **Aviso de afiliación:** Los enlaces de reserva de esta sección son de afiliado. trafico.live puede recibir una comisión por reservas completadas, sin repercusión en el precio que pagas. Nuestra cobertura editorial es independiente de estos acuerdos.

### English (international visitors)
```html
<aside class="text-xs text-tl-muted border-l-2 border-tl-amber-400 pl-3 my-4">
  <strong>Affiliate notice:</strong> Booking links in this section are affiliate links.
  trafico.live may earn a commission on completed bookings at no additional cost to you.
  Our editorial coverage is independent of these commercial arrangements.
</aside>
```

**Placement note:** Place immediately above or below any booking CTA block — not buried below the fold. Proximity to the affiliate link is required under FTC guidelines.

---

## Template 3 — Long Legal Page Section

**Use case:** `/aviso-legal#afiliados` anchor. Full disclosure for legal compliance.

### Spanish (primary)
```markdown
## Política de enlaces de afiliación {#afiliados}

**Última actualización: abril de 2026**

trafico.live es operado por Certus SPV, SLU ("nosotros", "la plataforma"). Algunos de los enlaces que aparecen en nuestras páginas son enlaces de afiliado, lo que significa que podemos recibir una compensación económica si realizas una compra o reserva a través de ellos.

### Qué son los enlaces de afiliado

Un enlace de afiliado es un enlace de seguimiento especial que identifica a trafico.live como la fuente de la visita al servicio de terceros. Si haces clic en uno de estos enlaces y completas una transacción (por ejemplo, una reserva de tren, ferry, autobús o vuelo), el proveedor del servicio puede pagarnos una comisión.

### Cómo afecta esto al precio que pagas

Los enlaces de afiliado no implican ningún coste adicional para ti. El precio que ves y pagas en el sitio del proveedor es idéntico al que pagarías accediendo directamente. En ningún caso inflamos precios ni ocultamos costes.

### Independencia editorial

Nuestra plataforma recoge y muestra datos de transporte en tiempo real (DGT, AEMET, Renfe, Ministerio de Transportes, MITECO y otras fuentes oficiales). Los acuerdos de afiliación no influyen en qué datos mostramos, cómo los clasificamos ni qué operadores cubrimos. Cubrimos todos los operadores relevantes independientemente de si tenemos un acuerdo comercial con ellos.

### Programas de afiliación activos

Podemos participar en programas de afiliación de, entre otros, los siguientes proveedores o redes:

- Skyscanner (Impact.com)
- Trainline (Partnerize)
- DirectFerries (programa propio)
- FlixBus (Awin)
- BlaBlaCar Bus (Kwanko)
- Awin (red de afiliados)
- Rakuten Advertising (red de afiliados)

Esta lista puede actualizarse. La ausencia de un proveedor en esta lista no significa que no exista un acuerdo; ante cualquier duda, considera que cualquier enlace de reserva puede ser de afiliado.

### Identificación de los enlaces

Los enlaces de afiliado se identifican mediante el aviso "Aviso de afiliación" visible en la sección correspondiente de cada página, y mediante el pie de página global de trafico.live. No ocultamos la naturaleza comercial de estos enlaces.

### Normativa aplicable

Esta política cumple con:
- **LSSI-CE** (Ley 34/2002 de Servicios de la Sociedad de la Información), Art. 20 — identificación de comunicaciones comerciales
- **Directiva 2005/29/CE** del Parlamento Europeo sobre prácticas comerciales desleales
- **FTC 16 CFR Part 255** (guías sobre endosos y testimonios, EE.UU.) — aplicable a visitantes internacionales
- **RGPD / GDPR** — el seguimiento de clics en enlaces de afiliado puede implicar cookies de terceros; consulta nuestra [Política de Cookies](/aviso-legal#cookies)

### Contacto

Para cualquier consulta sobre esta política: [mj@abemon.es](mailto:mj@abemon.es)
```

### English version (for international / legal mirroring)
```markdown
## Affiliate Link Policy {#affiliates}

**Last updated: April 2026**

trafico.live is operated by Certus SPV, SLU. Some links on our pages are affiliate links, meaning we may receive compensation if you make a purchase or booking through them.

**Your price is not affected.** Affiliate links carry no additional cost to you. The price displayed and charged at the provider's site is identical to what you would pay visiting directly.

**Editorial independence.** Our real-time transport data (sourced from DGT, AEMET, Renfe, Ministerio de Transportes, and other official sources) is displayed independently of any commercial relationships. Affiliate agreements do not influence what data we show, how we rank operators, or which providers we cover.

**Active programs.** We may participate in affiliate programs operated by Skyscanner (Impact.com), Trainline (Partnerize), DirectFerries, FlixBus (Awin), BlaBlaCar Bus (Kwanko), Awin, and Rakuten Advertising, among others.

**Regulatory compliance.** This disclosure complies with Spain's LSSI-CE Art. 20, EU Directive 2005/29/EC, and FTC 16 CFR Part 255.

Contact: [mj@abemon.es](mailto:mj@abemon.es)
```

---

## Implementation Checklist

- [ ] Template 1 (short) added to `src/app/layout.tsx` footer — live on all pages
- [ ] Template 2 (inline) added to `/trenes`, `/aviacion`, `/maritimo`, `/transporte-publico` sections with booking CTAs
- [ ] Template 3 (long) added to `/aviso-legal` page under `#afiliados` anchor in both languages
- [ ] All affiliate links use `rel="nofollow sponsored"` attribute
- [ ] Disclosure visible **before** user clicks affiliate link (proximity requirement)
- [ ] No disclosure hidden behind accordions or below-the-fold on desktop

---

## LSSI-CE Compliance Notes

Under Spanish LSSI-CE Article 20, commercial communications must be:
1. Clearly identified as commercial at the time of display
2. The natural or legal person on whose behalf the communication is made must be clearly identified

Both are satisfied by: displaying "trafico.live puede recibir una comisión" + linking to the full legal policy identifying Certus SPV, SLU as the operator.

**Minimum placement required:** At least the short strip on every page where an affiliate link appears. The long policy must exist at a stable URL accessible from every page (footer link to `/aviso-legal#afiliados`).
