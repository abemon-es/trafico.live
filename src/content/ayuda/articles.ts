/**
 * FAQ Articles — trafico.live Centro de ayuda
 * 10 artículos de referencia para el hub /ayuda
 */

export type ArticleCategory =
  | "Introducción"
  | "API"
  | "Tiers/Pricing"
  | "Facturación"
  | "MCP/AI"
  | "Integraciones"
  | "Datos/Fuentes"
  | "Flotas"
  | "Alertas"
  | "Cuenta";

export interface Article {
  slug: string;
  title: string;
  description: string;
  category: ArticleCategory;
  body: string;
}

export const articles: Article[] = [
  {
    slug: "obtener-clave-api",
    title: "¿Cómo obtengo mi primera clave API?",
    description:
      "Proceso paso a paso para registrarte, elegir un plan y generar tu primera clave API en trafico.live.",
    category: "Introducción",
    body: `## Primeros pasos

Para empezar a consumir los datos de trafico.live desde tu aplicación necesitas una clave API (API key). El proceso es sencillo y puedes tener tu primera clave en menos de cinco minutos.

### Paso 1 — Crea una cuenta

Accede a [trafico.live/registro](/registro) e introduce tu email y contraseña. Recibirás un correo de confirmación: haz clic en el enlace para activar tu cuenta.

### Paso 2 — Elige un plan

Una vez dentro del panel, dirígete a **Configuración → Plan**. Puedes empezar con el plan **FREE** sin introducir ninguna tarjeta de crédito. El plan FREE te da acceso a los endpoints públicos con un límite de 100 peticiones por minuto.

Si necesitas más capacidad o acceso a endpoints premium (rutas de flota, histórico de IMD, datos de calidad del aire a resolución horaria, etc.), puedes cambiar a **PRO** o **ENTERPRISE** en cualquier momento.

### Paso 3 — Genera tu clave

Ve a **Configuración → Claves API** y pulsa **Nueva clave**. Asigna un nombre descriptivo (por ejemplo, "producción-mi-app") y haz clic en **Crear**.

La clave se muestra una única vez en pantalla. Cópiala y guárdala en un lugar seguro (gestor de secretos, variable de entorno). No la incluyas en tu repositorio de código.

### Paso 4 — Primera petición

Añade la cabecera \`x-api-key: TU_CLAVE\` a cualquier petición HTTP:

\`\`\`bash
curl -H "x-api-key: TU_CLAVE" \\
  https://trafico.live/api/incidents?province=madrid&limit=10
\`\`\`

Si recibes un \`200 OK\` con datos JSON, todo está funcionando correctamente.

### Siguiente paso

Consulta el artículo [Cómo autenticar peticiones con x-api-key](/ayuda/autenticacion-api) para ver ejemplos en JavaScript, Python y otros lenguajes.`,
  },
  {
    slug: "diferencias-tiers",
    title: "¿Cuál es la diferencia entre FREE, PRO y ENTERPRISE?",
    description:
      "Comparativa detallada de los tres planes de trafico.live: límites, endpoints disponibles y precios.",
    category: "Tiers/Pricing",
    body: `## Planes disponibles

trafico.live ofrece tres niveles de acceso adaptados a distintos casos de uso, desde prototipos individuales hasta plataformas de movilidad en producción.

### Plan FREE

Ideal para explorar la API, desarrollar prototipos o proyectos personales:

- **100 peticiones por minuto** por clave API
- Acceso a todos los endpoints **públicos**: incidencias, gasolineras, radares, cámaras, avisos meteorológicos, calidad del aire, trenes en tiempo real y más
- Sin tarjeta de crédito
- Soporte vía documentación

### Plan PRO

Diseñado para startups, aplicaciones en producción y equipos pequeños:

- **1.000 peticiones por minuto**
- Todos los endpoints FREE más acceso a:
  - Datos históricos de IMD (2017–2024)
  - Microdata de accidentes DGT (2019–2023)
  - Historial de precios de combustible CNMC
  - API de flota en tiempo real (posiciones GPS de trenes LD)
  - Webhooks de alertas (hasta 5 endpoints)
- Soporte por email con respuesta en 24 h hábiles

### Plan ENTERPRISE

Para grandes integradores, plataformas de movilidad y administraciones públicas:

- **Sin límite de rate** (cuota acordada contractualmente)
- Todos los endpoints PRO más:
  - Matrices O-D de movilidad (Ministerio de Transportes BigData)
  - Estadísticas de transporte modal (INE)
  - Acceso al servidor MCP para integración con asistentes IA
  - SLA de disponibilidad 99,9 %
  - Soporte prioritario con SLA de 4 h

### Cambiar de plan

Puedes actualizar o cancelar en cualquier momento desde **Configuración → Plan**. Los cambios son efectivos de forma inmediata y la facturación se prorratea al día.`,
  },
  {
    slug: "limite-rate-limit",
    title: "¿Qué pasa si supero el límite de rate limit?",
    description:
      "Qué ocurre cuando se supera la cuota de peticiones, cómo interpretar el código 429 y estrategias para evitar bloqueos.",
    category: "API",
    body: `## Qué es el rate limit

El rate limit (límite de peticiones) controla cuántas llamadas puede hacer tu aplicación por minuto. Existe para garantizar que todos los usuarios del servicio tengan acceso estable a los datos, incluso durante picos de tráfico.

### Código HTTP 429 — Too Many Requests

Cuando superas el límite, la API devuelve un \`429 Too Many Requests\`. La respuesta incluye las cabeceras:

\`\`\`
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 47
Retry-After: 47
\`\`\`

\`Retry-After\` indica los segundos que debes esperar antes de volver a intentar la petición.

### Estrategias para evitar el 429

**1. Exponential backoff:** Si recibes un 429, espera unos segundos, luego el doble, y así sucesivamente hasta un máximo. La mayoría de librerías HTTP lo incluyen como opción.

**2. Caché local:** Almacena las respuestas que no cambian con frecuencia (catálogo de gasolineras, información de aeropuertos, etc.) durante varios minutos o horas.

**3. Controla tu cadencia:** Si haces polling de un endpoint de tiempo real, no bajes de intervalos de 15-30 segundos. La mayoría de nuestras fuentes se actualizan cada 5 minutos como mínimo.

**4. Uso de webhooks (PRO/ENTERPRISE):** En lugar de hacer polling, suscríbete a notificaciones push para recibir cambios sólo cuando ocurren.

### Ver tu consumo actual

En **Panel → Uso de API** puedes ver gráficas de consumo por endpoint, detectar picos inesperados y ajustar tu integración antes de alcanzar el límite.

### Si necesitas más capacidad

Actualiza a un plan superior desde **Configuración → Plan**. El cambio es inmediato y la nueva cuota entra en vigor en menos de un minuto.`,
  },
  {
    slug: "autenticacion-api",
    title: "Cómo autenticar peticiones con x-api-key",
    description:
      "Guía de autenticación: cabecera x-api-key, ejemplos en cURL, JavaScript, Python y Go.",
    category: "API",
    body: `## Mecanismo de autenticación

trafico.live usa autenticación mediante clave API estática. Debes incluir tu clave en la cabecera HTTP \`x-api-key\` de todas las peticiones a la API.

Las peticiones que **no** llevan \`x-api-key\` se tratan como anónimas y están limitadas al acceso de solo lectura del mismo origen (útil para peticiones desde el frontend de tu dominio propio). Las peticiones externas sin clave recibirán un \`401 Unauthorized\`.

### Ejemplos

**cURL**
\`\`\`bash
curl -H "x-api-key: TU_CLAVE" \\
  "https://trafico.live/api/incidents?province=barcelona&limit=20"
\`\`\`

**JavaScript (fetch)**
\`\`\`javascript
const res = await fetch("https://trafico.live/api/gas-stations/cheapest", {
  headers: { "x-api-key": process.env.TRAFICO_API_KEY }
});
const data = await res.json();
\`\`\`

**Python (httpx)**
\`\`\`python
import httpx, os

headers = {"x-api-key": os.environ["TRAFICO_API_KEY"]}
resp = httpx.get("https://trafico.live/api/trenes/posiciones", headers=headers)
trains = resp.json()
\`\`\`

**Go**
\`\`\`go
req, _ := http.NewRequest("GET", "https://trafico.live/api/aviacion", nil)
req.Header.Set("x-api-key", os.Getenv("TRAFICO_API_KEY"))
client := &http.Client{}
resp, _ := client.Do(req)
\`\`\`

### Buenas prácticas de seguridad

- Guarda la clave en variables de entorno o en un gestor de secretos (Vault, AWS Secrets Manager, Railway/Coolify secrets).
- **Nunca** la incluyas hardcodeada en el código fuente ni en repositorios.
- Si crees que una clave está comprometida, revócala desde el Panel y genera una nueva al instante.
- Usa claves distintas para entornos de desarrollo y producción para facilitar la rotación.`,
  },
  {
    slug: "usar-mcp",
    title: "Usar trafico.live desde Claude / Cursor con MCP",
    description:
      "Cómo conectar el servidor MCP de trafico.live a Claude Desktop, Claude Code o Cursor para consultar datos de tráfico desde un asistente IA.",
    category: "MCP/AI",
    body: `## Qué es el servidor MCP de trafico.live

trafico.live expone un servidor [Model Context Protocol (MCP)](https://modelcontextprotocol.io) que permite a asistentes IA como Claude o Cursor consultar datos de tráfico, meteorología, combustible, trenes, calidad del aire y más, directamente desde una conversación.

El servidor MCP es una funcionalidad del plan **ENTERPRISE**. Si estás en un plan inferior y quieres probarlo, contacta con nosotros para solicitar acceso temporal.

### Configuración en Claude Desktop

1. Abre \`~/Library/Application Support/Claude/claude_desktop_config.json\`
2. Añade la entrada del servidor:

\`\`\`json
{
  "mcpServers": {
    "trafico-live": {
      "command": "npx",
      "args": ["-y", "@trafico-live/mcp-server"],
      "env": {
        "TRAFICO_API_KEY": "TU_CLAVE_ENTERPRISE"
      }
    }
  }
}
\`\`\`

3. Reinicia Claude Desktop. Verás el icono de herramientas activo cuando el servidor esté conectado.

### Herramientas disponibles

Una vez conectado, Claude puede usar más de 12 herramientas:

- \`get_incidents\` — incidencias activas por provincia o carretera
- \`get_fuel_prices\` — precios mínimos de combustible por provincia
- \`get_trains\` — trenes en tiempo real con posición GPS y retrasos
- \`get_weather_alerts\` — alertas meteorológicas AEMET activas
- \`get_air_quality\` — índice ICA por estación o provincia
- \`search\` — búsqueda global (gasolineras, cámaras, radares, estaciones…)
- Y más: radares, cámaras, flota marítima, vuelos en tiempo real

### Ejemplo de conversación

> "¿Hay incidencias graves en la A-6 ahora mismo?"

Claude llamará a \`get_incidents\` con los parámetros adecuados y te devolverá un resumen con los eventos activos, su gravedad y kilómetro aproximado.

### Configuración en Cursor

El proceso es equivalente: añade el servidor en **Cursor → Settings → MCP Servers** con las mismas credenciales.`,
  },
  {
    slug: "fuentes-datos",
    title: "¿De dónde vienen los datos? (DGT, AEMET, Renfe…)",
    description:
      "Catálogo de fuentes de datos oficiales y en tiempo real que alimentan trafico.live, con cadencia de actualización.",
    category: "Datos/Fuentes",
    body: `## Fuentes de datos

trafico.live agrega información de más de 20 fuentes oficiales y abiertas para ofrecer la visión más completa de la movilidad en España. Aquí tienes el catálogo principal:

### Tráfico y carreteras
- **DGT (Dirección General de Tráfico):** Incidencias en tiempo real (protocolo DATEX II XML), radares de tramo y puntuales, cámaras de tráfico, microdata de accidentes (XLSX anual 2019-2023). Actualización: cada 2 minutos para incidencias.
- **Ministerio de Transportes (ArcGIS):** Mapa de Tráfico con Intensidad Media Diaria (IMD) de carreteras, estaciones de aforo. Datos anuales.
- **Ayuntamiento de Madrid (informo.madrid.es):** 6.117 sensores de intensidad de tráfico urbano. Actualización: cada 5 minutos.
- **Barcelona, Valencia, Zaragoza:** Sensores urbanos de tráfico vía Open Data.

### Meteorología y medio ambiente
- **AEMET (Agencia Estatal de Meteorología):** Alertas activas, histórico climático de ~900 estaciones, previsión por municipio.
- **MITECO (Ministerio para la Transición Ecológica):** Índice de Calidad del Aire (ICA) de 506 estaciones a nivel nacional. Actualización: cada hora.

### Transporte ferroviario
- **Renfe (GTFS + GTFS-RT):** Catálogo estático de 2.154 estaciones y 1.248 rutas. Alertas de servicio cada 2 minutos. Posiciones GPS de Cercanías en tiempo real.
- **Renfe LD Fleet API:** Posiciones GPS y retrasos de ~115 trenes de Larga Distancia activos. Actualización: cada 2 minutos.

### Combustible y energía
- **MINETUR/MITERD:** Precios de carburantes en 11.000+ gasolineras. Actualización diaria.
- **CNMC:** Histórico provincial de precios de carburantes desde 2016 (datos de tendencia).

### Transporte marítimo y aéreo
- **aisstream.io:** Posiciones AIS de embarcaciones en tiempo real (~10 millones de posiciones/día).
- **OpenSky Network:** Posiciones ADS-B de aeronaves sobre España. Actualización: cada 15 minutos.
- **AENA / Eurostat:** Estadísticas anuales de pasajeros en 42 aeropuertos españoles.

### Licencias

La mayoría de las fuentes son **abiertas** (Open Data, CC-BY). Los datos se atribuyen en cada endpoint de la API y en las páginas de visualización.`,
  },
  {
    slug: "flota-onboarding",
    title: "Onboarding flotas: del primer POST a dashboard",
    description:
      "Guía de integración para gestores de flota: cómo enviar posiciones GPS, consultar alertas de ruta y acceder al dashboard.",
    category: "Flotas",
    body: `## Integrar tu flota en trafico.live

trafico.live permite a gestores de flotas de transporte conectar sus vehículos para recibir alertas en ruta, superponer incidencias DGT en tiempo real y visualizar el estado de toda la flota en un mapa centralizado.

### Requisitos previos

- Plan **PRO** o **ENTERPRISE** activo
- Clave API con permiso de escritura (scope \`fleet:write\`)
- Vehículos con GPS capaz de emitir posición cada 30 s o menos

### Paso 1 — Registrar los vehículos

Cada vehículo se identifica con una matrícula o ID interno. Regístralos desde el panel en **Flotas → Vehículos → Nuevo** o vía API:

\`\`\`bash
curl -X POST https://trafico.live/api/flotas/vehiculos \\
  -H "x-api-key: TU_CLAVE" \\
  -H "Content-Type: application/json" \\
  -d '{"id": "VEH-001", "name": "Camión Madrid-Valencia", "plate": "1234ABC"}'
\`\`\`

### Paso 2 — Enviar posiciones GPS

Una vez registrado el vehículo, tu dispositivo GPS (o telemetría OBD) debe hacer POST de posición periódicamente:

\`\`\`bash
curl -X POST https://trafico.live/api/flotas/posiciones \\
  -H "x-api-key: TU_CLAVE" \\
  -H "Content-Type: application/json" \\
  -d '{
    "vehicleId": "VEH-001",
    "lat": 40.4168,
    "lng": -3.7038,
    "speed": 87,
    "heading": 135,
    "timestamp": "2024-04-17T10:23:00Z"
  }'
\`\`\`

### Paso 3 — Alertas automáticas en ruta

Con las posiciones activas, trafico.live correlaciona automáticamente la ubicación del vehículo con:

- Incidencias DGT en un radio de 30 km
- Alertas AEMET por fenómenos adversos (lluvia, nieve, viento fuerte)
- Cierres de carretera o restricciones de tráfico pesado

Las alertas se entregan vía webhook (configurable en **Flotas → Webhooks**) o consultables en \`/api/flotas/alertas?vehicleId=VEH-001\`.

### Paso 4 — Dashboard de flota

Accede a [trafico.live/flotas/dashboard](/flotas/dashboard) para ver el mapa con todos tus vehículos activos, historial de rutas y panel de alertas. Los gestores pueden invitar a colaboradores con roles limitados desde **Configuración → Equipo**.`,
  },
  {
    slug: "alertas-push",
    title: "Alertas push: activar notificaciones del navegador",
    description:
      "Cómo activar y gestionar las notificaciones push de tráfico, meteorología y combustible en el navegador.",
    category: "Alertas",
    body: `## Qué son las alertas push

Las alertas push te permiten recibir notificaciones en tiempo real en tu navegador o dispositivo móvil sin necesidad de tener trafico.live abierto. Son útiles para:

- Incidencias graves en carreteras que usas habitualmente
- Alertas AEMET de nivel naranja o rojo en tu provincia
- Bajada de precio de combustible por debajo de tu umbral objetivo

### Activar notificaciones

1. Accede a [trafico.live](https://trafico.live) con tu cuenta iniciada.
2. Haz clic en el icono de campana en la barra superior y selecciona **Activar notificaciones**.
3. El navegador pedirá permiso. Haz clic en **Permitir**.

Una vez activadas, configura qué tipos de alerta quieres recibir en **Configuración → Alertas push**.

### Tipos de alerta disponibles

| Tipo | Descripción | Frecuencia máxima |
|------|-------------|-------------------|
| Incidencias graves | Accidentes, cortes totales | Inmediata |
| Alertas meteo | Nivel naranja/rojo AEMET | Inmediata |
| Precio combustible | Cuando baja de tu umbral | 1 por día |
| Retrasos de tren | Cercanías >15 min retraso | Inmediata |

### Gestionar alertas por zona

En **Alertas → Zonas** puedes definir áreas geográficas (un radio alrededor de tu domicilio, el trayecto habitual al trabajo, etc.) y recibir notificaciones solo cuando los eventos ocurren dentro de esas zonas.

### Cancelar notificaciones

Para desactivarlas, ve a **Configuración → Alertas push** y pulsa **Desactivar**. También puedes revocar el permiso desde los ajustes de tu navegador en cualquier momento.

### Compatibilidad

Las notificaciones push funcionan en Chrome, Edge, Firefox y Safari (macOS 13+ / iOS 16.4+). En dispositivos móviles con iOS necesitas añadir trafico.live a tu pantalla de inicio como PWA.`,
  },
  {
    slug: "facturacion-iva",
    title: "Facturación, IVA y reembolsos",
    description:
      "Información sobre ciclos de facturación, IVA aplicable, descarga de facturas y política de reembolsos.",
    category: "Facturación",
    body: `## Ciclo de facturación

Los planes PRO y ENTERPRISE se facturan mensualmente el mismo día en que activaste la suscripción. El cargo se realiza automáticamente en la tarjeta o método de pago que hayas registrado.

Puedes cambiar el método de pago en cualquier momento desde **Configuración → Facturación → Método de pago**.

### Facturas y descarga

Todas las facturas están disponibles en **Configuración → Facturación → Historial de facturas**. Cada factura se genera automáticamente al procesarse el cobro y puedes descargarla en PDF.

Si necesitas facturas con datos fiscales específicos de tu empresa (CIF, nombre social, dirección fiscal), actualiza los datos en **Configuración → Empresa** antes de que se genere la próxima factura.

### IVA

trafico.live está gestionado por **Certus SPV, SLU**, empresa española con domicilio fiscal en España.

- **Clientes en España:** IVA al 21 % incluido en el precio mostrado.
- **Clientes en la UE con CIF intracomunitario válido:** Operación exenta por inversión del sujeto pasivo. Introduce tu VAT ID en **Configuración → Empresa** para que se aplique correctamente.
- **Clientes fuera de la UE:** Sin IVA.

Si tu factura no refleja correctamente el tratamiento fiscal, contacta con nosotros en [support@trafico.live](mailto:support@trafico.live) antes de la siguiente fecha de facturación.

### Cancelación y reembolsos

Puedes cancelar tu plan en cualquier momento. La cancelación se hace efectiva al final del período de facturación en curso: no se cobra el mes siguiente y no se interrumpe el acceso hasta que termina el período pagado.

No ofrecemos reembolsos prorrateados por los días no utilizados, salvo en caso de fallo grave del servicio (SLA incumplido según contrato ENTERPRISE). Si tienes una situación excepcional, escríbenos y la valoramos caso a caso.

### ¿Preguntas sobre tu factura?

Envíanos un email a [support@trafico.live](mailto:support@trafico.live) con el número de factura y te respondemos en 24 horas hábiles.`,
  },
  {
    slug: "webhooks-integraciones",
    title: "Integraciones: webhooks y ejemplos",
    description:
      "Cómo configurar webhooks para recibir eventos en tiempo real y ejemplos de integración con Slack, n8n y Make.",
    category: "Integraciones",
    body: `## Webhooks de trafico.live

Los webhooks te permiten recibir notificaciones HTTP en tu servidor cuando ocurren eventos relevantes: nueva incidencia, alerta meteorológica, vehículo de flota fuera de zona, etc. Son la alternativa eficiente al polling.

Los webhooks están disponibles en los planes **PRO** (hasta 5 endpoints) y **ENTERPRISE** (ilimitados).

### Configurar un webhook

1. Ve a **Configuración → Integraciones → Webhooks**.
2. Pulsa **Nuevo webhook**.
3. Introduce la URL de tu endpoint (debe ser HTTPS).
4. Selecciona los tipos de evento que quieres recibir.
5. Guarda. Recibirás un evento de prueba (\`ping\`) para verificar la conectividad.

### Estructura del payload

Todos los eventos tienen el mismo envoltorio:

\`\`\`json
{
  "event": "incident.created",
  "timestamp": "2024-04-17T10:23:00Z",
  "data": { ... }
}
\`\`\`

Los tipos de evento disponibles son: \`incident.created\`, \`incident.resolved\`, \`weather.alert.new\`, \`fuel.price.target\`, \`fleet.vehicle.alert\`.

### Verificar la firma

Cada request lleva la cabecera \`X-Trafico-Signature\` con un HMAC-SHA256 del body firmado con tu webhook secret. Verifica siempre la firma antes de procesar el evento:

\`\`\`javascript
import crypto from "crypto";

function verifySignature(body, signature, secret) {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(body, "utf8")
    .digest("hex");
  return crypto.timingSafeEqual(
    Buffer.from(expected),
    Buffer.from(signature)
  );
}
\`\`\`

### Integración con Slack

Usa el [conector de webhooks de Slack](https://api.slack.com/messaging/webhooks) como endpoint. El payload de trafico.live es JSON estándar compatible con Slack Incoming Webhooks.

### Integración con n8n / Make

En n8n usa el nodo **Webhook** como disparador. En Make usa el módulo **Webhooks → Custom webhook**. Ambas plataformas aceptan el payload JSON directamente y puedes mapearlo a cualquier servicio downstream (email, Notion, Google Sheets, etc.).

### Reintentos

Si tu endpoint devuelve un código distinto de 2xx, trafico.live reintentará la entrega hasta 5 veces con backoff exponencial (10 s, 30 s, 2 min, 10 min, 1 h). Después de 5 fallos consecutivos, el webhook se desactiva y recibirás un email de notificación.`,
  },
];

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}

export function getRelatedArticles(slug: string, limit = 3): Article[] {
  const article = getArticleBySlug(slug);
  if (!article) return [];
  return articles
    .filter((a) => a.slug !== slug && a.category === article.category)
    .slice(0, limit);
}

export const CATEGORIES: ArticleCategory[] = [
  "Introducción",
  "API",
  "Tiers/Pricing",
  "Facturación",
  "MCP/AI",
  "Integraciones",
  "Datos/Fuentes",
  "Flotas",
  "Alertas",
  "Cuenta",
];
