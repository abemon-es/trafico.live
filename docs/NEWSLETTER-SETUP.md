# Newsletter Setup — trafico.live

Guía de configuración para el sistema de newsletter con Resend (double opt-in, Audiences, envío masivo).

---

## 1. Crear cuenta Resend y verificar dominio

1. Registrate en [resend.com](https://resend.com) con el email corporativo `mj@abemon.es`
2. En el dashboard ve a **Domains → Add Domain**
3. Introduce `trafico.live` (sin subdominio — se enviará desde `hola@trafico.live`)
4. Añade los registros DNS en Cloudflare:

| Tipo | Nombre | Valor | TTL |
|------|--------|-------|-----|
| TXT | `resend._domainkey.trafico.live` | (valor DKIM que da Resend) | Auto |
| TXT | `trafico.live` | `v=spf1 include:amazonses.com ~all` | Auto |
| TXT | `_dmarc.trafico.live` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@trafico.live` | Auto |

5. En Cloudflare, asegúrate de que los registros están en modo **DNS only** (nube gris), no proxied.
6. Resend tarda entre 30 min y 6 horas en verificar. Comprueba en **Domains** hasta que aparezca ✓ Verified.

---

## 2. Crear API Key

1. Ve a **API Keys → Create API Key**
2. Nombre: `trafico-live-production`
3. Permisos: **Full access** (necesario para Audiences y envíos)
4. Guarda la clave — solo se muestra una vez

---

## 3. Crear Audience (lista de suscriptores)

1. Ve a **Audiences → Create Audience**
2. Nombre: `Newsletter trafico.live`
3. Copia el Audience ID (formato `aud_xxxxxxxxxx`)

---

## 4. Variables de entorno

Añade estas variables al `.env.local` y a la configuración de Coolify:

```env
# Resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_AUDIENCE_ID=aud_xxxxxxxxxx
NEWSLETTER_FROM=trafico.live <hola@trafico.live>
```

> **Nota:** `NEWSLETTER_FROM` debe usar una dirección del dominio verificado (`trafico.live`). No uses `@abemon.es` para envíos de trafico.live — los filtros de spam penalizan el mismatch de dominio.

---

## 5. Instalar Resend SDK

```bash
npm install resend
```

La dependencia ya está referenciada en `src/lib/resend.ts`. Si no está en `package.json`:

```bash
npm install resend@^4
```

---

## 6. Modelo de base de datos

Ejecutar la migración incluida en `docs/PRISMA-PROPOSAL-T4-NEWSLETTER.md` antes de desplegar:

```bash
npm run db:migrate
# o en producción:
npx prisma migrate deploy
```

---

## 7. Primer envío — checklist

Antes del primer envío a suscriptores reales:

- [ ] Dominio verificado en Resend (DKIM + SPF + DMARC)
- [ ] Audience creado y `RESEND_AUDIENCE_ID` configurado
- [ ] Test de confirmación: suscribirse con email propio en `/recursos/guia-multimodal`
- [ ] Verificar llegada del email de confirmación (revisar carpeta spam)
- [ ] Confirmar link → verificar llegada del email de bienvenida
- [ ] Test de baja: usar el link de unsubscribe del email de bienvenida → verificar página HTML de baja
- [ ] Revisar puntuación spam con [mail-tester.com](https://mail-tester.com) (objetivo: ≥9/10)
- [ ] Primera newsletter de prueba: enviar solo al email del operador antes del envío masivo

---

## 8. Cadencia y estructura de la newsletter semanal

**Frecuencia:** lunes por la mañana (08:00-09:00 hora española)

**Estructura recomendada (3+1 formato):**

```
Asunto: [trafico.live] Semana del {fecha} — {titular principal}

1. 📊 DATO DE LA SEMANA
   Un dato llamativo de los colectores: ej. "Viernes pasado fue el día
   con más incidencias de la A-4 en lo que va de año"

2. 🚄 ACTUALIDAD FERROVIARIA
   Resumen de alertas Renfe, cambios de servicio, puntualidad por marca

3. ⛽ PRECIO DE COMBUSTIBLE
   Evolución semanal, gasolinera más barata por provincia destacada,
   tendencia CNMC

4. 🗺️ ENLACE DESTACADO
   Una página de trafico.live o guía que sea especialmente útil esa semana
   (temporada, festivos, obras importantes, etc.)

Footer: unsubscribe | privacidad | trafico.live
```

**Objetivo de tasa de baja:** < 0,5% por envío. Si supera ese umbral, revisar relevancia del contenido.

---

## 9. Envío masivo con la API

Para enviar a todos los confirmados (cuando la lista crece):

```typescript
// scripts/send-newsletter.ts
import { prisma } from "@/lib/db"
import { sendNewsletter } from "@/lib/resend"
import { renderToStaticMarkup } from "react-dom/server"
import { createElement } from "react"
// import { WeeklyDigestTemplate } from "@/emails/weekly-digest"

async function main() {
  const subscribers = await prisma.newsletterSubscription.findMany({
    where: { status: "CONFIRMED" },
    select: { email: true, unsubscribeToken: true },
  })

  console.log(`Enviando a ${subscribers.length} suscriptores…`)

  const BATCH_SIZE = 50 // Resend límite por request en plan gratuito
  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE)
    // Resend soporta hasta 50 destinatarios por llamada en plan Business
    // Para plan gratuito, enviar de uno en uno o usar Broadcasts
    for (const sub of batch) {
      await sendNewsletter({
        to: sub.email,
        subject: "[trafico.live] Resumen semanal",
        html: "<!-- renderizado aquí -->",
        tags: [{ name: "type", value: "weekly_digest" }],
      })
    }
    await new Promise(r => setTimeout(r, 200)) // rate limit cortesía
  }
}

main().catch(console.error)
```

> Para listas grandes (>1.000 contactos) usa la funcionalidad **Broadcasts** de Resend que gestiona el envío masivo internamente con mejor deliverability.

---

## 10. Monitorización

- **Resend Dashboard → Logs:** verifica opens, bounces y spam reports en tiempo real
- **Alerta Sentry:** el wrapper `src/lib/resend.ts` logea errores con `console.warn`; configura una alerta en GlitchTip para `[Resend]` en logs de servidor
- **Tasa de rebote objetivo:** < 2%. Si supera 5%, pausa envíos y limpia la lista
