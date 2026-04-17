# Crisp Chat — Setup y configuración

Guía de configuración del widget de soporte en vivo de trafico.live.

---

## 1. Crear cuenta en Crisp

1. Ve a [crisp.chat](https://crisp.chat) y crea una cuenta (plan gratuito incluye 2 agentes y widget ilimitado).
2. Crea un nuevo **Workspace** llamado `trafico.live`.
3. En la barra lateral, ve a **Settings → Website → Add a new website** e introduce `trafico.live`.

---

## 2. Obtener el Website ID

1. En el dashboard de Crisp, abre el workspace de trafico.live.
2. Ve a **Settings → Website Settings → Setup Instructions**.
3. Copia el valor de `window.CRISP_WEBSITE_ID = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"`.

---

## 3. Configurar la variable de entorno

Añade la variable al `.env.local` (desarrollo) y a los secrets de producción (Coolify / Docker Compose):

```env
NEXT_PUBLIC_CRISP_WEBSITE_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

El componente `CrispWidget` comprueba esta variable al arrancar. Si no está definida, **no renderiza nada** (graceful fallback). No es necesario ningún cambio de código.

---

## 4. Puntos de montaje recomendados

**NO añadir en el layout raíz** (`src/app/layout.tsx` — T2.3 lo gestiona). En su lugar, montar en las páginas comerciales y de soporte:

| Archivo | Motivo |
|---------|--------|
| `src/app/api-landing/page.tsx` o `layout.tsx` | Página principal de conversión — máxima prioridad |
| `src/app/dashboard/layout.tsx` | Usuarios autenticados del panel |
| `src/app/flotas/dashboard/layout.tsx` | Gestores de flota |
| `src/app/account/page.tsx` | Configuración de cuenta / billing |

Ejemplo de uso en un Server Component:

```tsx
// src/app/api-landing/page.tsx (ejemplo)
import CrispWidget from "@/components/support/CrispWidget";
import { getServerSession } from "next-auth"; // o tu auth provider

export default async function ApiLandingPage() {
  const session = await getServerSession();
  return (
    <>
      {/* ... contenido de la página ... */}
      <CrispWidget
        email={session?.user?.email}
        name={session?.user?.name}
      />
    </>
  );
}
```

Si el usuario no está autenticado, pasa `email={null}` o simplemente `<CrispWidget />` sin props.

---

## 5. Configurar chatbot y horario de atención

### Mensaje de bienvenida automático

En Crisp dashboard → **Settings → Chatbox → Automated Messages**:

- **Mensaje inicial** (aparece a los 30 s en `/api-landing`):
  > "¡Hola! ¿Tienes alguna pregunta sobre la API de trafico.live? Estamos aquí para ayudarte."

### Chatbot de respuesta fuera de horario

En **Settings → Chatbot** → crear un bot básico con respuesta automática:

> "Gracias por escribirnos. Nuestro horario de atención es de lunes a viernes, de 9:00 a 18:00 (hora de Madrid). Te responderemos en cuanto podamos. Mientras tanto, consulta nuestro [centro de ayuda](https://trafico.live/ayuda)."

### Horario de atención (España — CET/CEST)

En **Settings → Availability**:

- Zona horaria: `Europe/Madrid`
- Lunes a viernes: 09:00–18:00
- Sábado y domingo: sin atención (el bot responde automáticamente)

---

## 6. Identificación de usuarios autenticados

El componente `CrispWidget` acepta `email` y `name` como props. Cuando se proporcionan, llama a:

```javascript
window.$crisp.push(["set", "user:email", [email]]);
window.$crisp.push(["set", "user:nickname", [name]]);
```

Esto permite ver en el dashboard de Crisp quién está chateando sin que el usuario tenga que identificarse manualmente.

Para añadir datos adicionales (plan, empresa):

```typescript
// En el cliente, después de que $crisp esté disponible
window.$crisp.push(["set", "session:data", [[
  ["plan", "PRO"],
  ["company", "Acme Logistics"]
]]]);
```

---

## 7. Variables de entorno requeridas

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `NEXT_PUBLIC_CRISP_WEBSITE_ID` | Sí (para activar) | ID del website en Crisp |

Sin esta variable el widget no carga. No hay errores, simplemente no aparece el chat.
