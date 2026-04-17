# Prisma Proposal — T4 Newsletter Subscription

**Autor:** T4.9b · 2026-04-17  
**Estado:** Propuesta para aprobación antes de migrar `prisma/schema.prisma`  
**Dependiente de:** Team-lead aprueba adición al schema principal

---

## Modelo propuesto

```prisma
/// Suscriptores al newsletter semanal de trafico.live.
/// Double opt-in: PENDING_CONFIRMATION → CONFIRMED (vía token).
/// Baja: CONFIRMED → UNSUBSCRIBED (vía unsubscribeToken).
model NewsletterSubscription {
  id               String    @id @default(cuid())
  email            String    @unique
  /// PENDING_CONFIRMATION | CONFIRMED | UNSUBSCRIBED | BOUNCED
  status           String    @default("PENDING_CONFIRMATION")
  confirmToken     String?   @unique
  unsubscribeToken String    @unique
  source           String?   // página de origen: "guia-multimodal", "home", etc.
  leadMagnet       String?   // lead magnet slug: "guia-multimodal"
  subscribedAt     DateTime  @default(now())
  confirmedAt      DateTime?
  unsubscribedAt   DateTime?

  @@index([status])
  @@index([subscribedAt])
}
```

---

## Enumeración de estados

| Estado | Descripción |
|--------|-------------|
| `PENDING_CONFIRMATION` | Solicitud recibida, email de confirmación enviado, pendiente de clic |
| `CONFIRMED` | Email confirmado vía double opt-in, suscriptor activo |
| `UNSUBSCRIBED` | Baja voluntaria vía link o petición directa |
| `BOUNCED` | Email rebotado (hard bounce reportado por Resend webhook — implementación futura) |

---

## Migración SQL equivalente

Para ejecutar directamente si Prisma no está disponible:

```sql
CREATE TABLE "NewsletterSubscription" (
    "id"               TEXT         NOT NULL,
    "email"            TEXT         NOT NULL,
    "status"           TEXT         NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "confirmToken"     TEXT,
    "unsubscribeToken" TEXT         NOT NULL,
    "source"           TEXT,
    "leadMagnet"       TEXT,
    "subscribedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt"      TIMESTAMP(3),
    "unsubscribedAt"   TIMESTAMP(3),

    CONSTRAINT "NewsletterSubscription_pkey" PRIMARY KEY ("id")
);

-- Índices únicos
CREATE UNIQUE INDEX "NewsletterSubscription_email_key"
    ON "NewsletterSubscription"("email");

CREATE UNIQUE INDEX "NewsletterSubscription_confirmToken_key"
    ON "NewsletterSubscription"("confirmToken");

CREATE UNIQUE INDEX "NewsletterSubscription_unsubscribeToken_key"
    ON "NewsletterSubscription"("unsubscribeToken");

-- Índices de rendimiento
CREATE INDEX "NewsletterSubscription_status_idx"
    ON "NewsletterSubscription"("status");

CREATE INDEX "NewsletterSubscription_subscribedAt_idx"
    ON "NewsletterSubscription"("subscribedAt");
```

---

## Notas de implementación

1. **`confirmToken`** se genera como hex de 32 bytes (`crypto.randomBytes(32).toString('hex')`),
   lo que produce 64 caracteres. Es `nullable` porque se pone a `null` tras la confirmación
   (invalidación del token).

2. **`unsubscribeToken`** se genera igual pero **nunca se invalida** — permite re-suscripción
   posterior usando el mismo token de baja como identificador. Se crea en el momento de la
   primera suscripción y no cambia.

3. **`source`** y **`leadMagnet`** son campos libres para segmentación. No se usan como enums
   para no requerir migraciones cada vez que se añade una nueva fuente.

4. El modelo **no** almacena contraseñas, PII adicional (nombre, teléfono) ni datos de pago.
   Solo el email mínimo necesario para el envío. Compatible con RGPD (base legal: consentimiento
   explícito vía double opt-in).

5. Para cumplir con el derecho de supresión (RGPD art. 17), implementar un endpoint
   `DELETE /api/newsletter/data?token=...` que elimine físicamente la fila en lugar de
   solo cambiar el status. Propuesta para S2.

---

## Integración con el API route

El route `POST /api/newsletter` hace:

```typescript
await prisma.newsletterSubscription.upsert({
  where: { email },
  create: { email, status: "PENDING_CONFIRMATION", confirmToken, unsubscribeToken, source, leadMagnet },
  update: { status: "PENDING_CONFIRMATION", confirmToken },
})
```

El route `GET /api/newsletter/confirm` hace:

```typescript
await prisma.newsletterSubscription.update({
  where: { confirmToken: token },
  data: { status: "CONFIRMED", confirmToken: null, confirmedAt: new Date() },
})
```

El route `GET /api/newsletter/unsubscribe` hace:

```typescript
await prisma.newsletterSubscription.update({
  where: { unsubscribeToken: token },
  data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
})
```

---

## Consultas útiles de administración

```sql
-- Resumen de estados
SELECT status, COUNT(*) as total
FROM "NewsletterSubscription"
GROUP BY status
ORDER BY total DESC;

-- Suscriptores confirmados en los últimos 30 días
SELECT email, "confirmedAt", source, "leadMagnet"
FROM "NewsletterSubscription"
WHERE status = 'CONFIRMED'
  AND "confirmedAt" > NOW() - INTERVAL '30 days'
ORDER BY "confirmedAt" DESC;

-- Tasa de confirmación por fuente
SELECT source,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'CONFIRMED') AS confirmed,
       ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'CONFIRMED') / COUNT(*), 1) AS confirmation_rate
FROM "NewsletterSubscription"
GROUP BY source
ORDER BY total DESC;

-- Limpiar tokens pendientes de más de 7 días
DELETE FROM "NewsletterSubscription"
WHERE status = 'PENDING_CONFIRMATION'
  AND "subscribedAt" < NOW() - INTERVAL '7 days';
```
