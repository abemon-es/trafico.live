/**
 * Seed script: migrate blog articles + create initial tags
 *
 * Usage: npx tsx scripts/seed-noticias.ts
 *
 * Idempotent — skips articles/tags that already exist.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

const TAGS = [
  { slug: "dgt", name: "DGT" },
  { slug: "aemet", name: "AEMET" },
  { slug: "precio-combustible", name: "Precio combustible" },
  { slug: "diesel", name: "Diésel" },
  { slug: "gasolina", name: "Gasolina" },
  { slug: "zbe", name: "ZBE" },
  { slug: "baliza-v16", name: "Baliza V16" },
  { slug: "radares", name: "Radares" },
  { slug: "incidencias", name: "Incidencias" },
  { slug: "meteorologia", name: "Meteorología" },
  { slug: "etiqueta-ambiental", name: "Etiqueta ambiental" },
  { slug: "informe-diario", name: "Informe diario" },
  { slug: "informe-semanal", name: "Informe semanal" },
  { slug: "conduccion-eficiente", name: "Conducción eficiente" },
  { slug: "seguridad-vial", name: "Seguridad vial" },
  { slug: "estadisticas", name: "Estadísticas" },
  { slug: "tendencia", name: "Tendencia" },
  { slug: "normativa", name: "Normativa" },
];

// ---------------------------------------------------------------------------
// Blog articles → Article model (markdown body)
// ---------------------------------------------------------------------------

const BLOG_ARTICLES = [
  {
    slug: "que-es-baliza-v16-como-funciona",
    title: "¿Qué es la baliza V16 y cómo funciona?",
    summary:
      "Todo sobre la nueva baliza V16 obligatoria: qué es, cuándo es obligatoria, cómo funciona y dónde comprar la mejor.",
    category: "GUIDE" as const,
    readTime: "5 min",
    tags: ["baliza-v16", "dgt", "seguridad-vial", "normativa"],
    publishedAt: new Date("2026-03-24"),
    body: `## ¿Qué es la baliza V16?

La baliza V16 es un dispositivo luminoso de señalización de emergencia homologado por la DGT. Emite una luz naranja intermitente visible a **1 km de distancia** y, en su versión conectada, transmite la posición GPS del vehículo averiado al sistema DGT 3.0 en tiempo real.

Desde el 1 de enero de 2026, la baliza V16 es **obligatoria** para todos los vehículos matriculados en España. Reemplaza definitivamente a los triángulos de advertencia en carretera.

## ¿Por qué reemplaza a los triángulos?

Los triángulos de advertencia obligaban al conductor a salir del vehículo y caminar por el arcén para colocarlos, una maniobra responsable de **más del 30% de las muertes en arcén** según los datos de la DGT. La baliza V16 se coloca sobre el techo del propio vehículo sin necesidad de bajarse, eliminando ese riesgo.

- No es necesario salir del vehículo para colocarla
- Funciona tanto de día como de noche gracias a su luz de alta intensidad
- La versión conectada alerta automáticamente a otros conductores a través del sistema DGT 3.0
- Compatible con todos los tipos de techo (plano, cristal, panorámico)

## Cronología de la obligatoriedad

- **2021:** La DGT anuncia la sustitución de los triángulos de emergencia
- **2023:** Se publican las especificaciones técnicas de homologación
- **2024:** Convivencia: se permite usar triángulos o baliza V16
- **1 enero 2026:** La baliza V16 conectada es **obligatoria**. Los triángulos dejan de ser válidos

## Cómo elegir la mejor baliza V16

Una buena baliza V16 debe cumplir estos requisitos:

- **Homologación DGT:** Busca el sello "e" o "E" en el dispositivo
- **Conectividad:** Debe conectarse al sistema DGT 3.0 vía tarjeta SIM integrada
- **Autonomía:** Mínimo 30 minutos de uso continuo (lo exige la normativa)
- **Resistencia:** Certificación IP54 o superior (lluvia, polvo, vibraciones)
- **Imán potente:** Para fijarse al techo del coche en cualquier circunstancia

## ¿Qué pasa si no la llevo?

Circular sin baliza V16 a bordo puede suponer una multa de **200 €**. Si ocurre una emergencia y no se señaliza correctamente, la sanción puede llegar a los **500 €**.

## Consulta el tráfico en tiempo real

- [Mapa de incidencias](/incidencias) — estado actual del tráfico en España
- [Cámaras DGT](/camaras) — imágenes en vivo de las carreteras
- [Radares DGT](/radares) — ubicaciones actualizadas

---

*Fuente: DGT, Reglamento General de Vehículos.*`,
  },
  {
    slug: "zonas-bajas-emisiones-guia-completa",
    title: "Zonas de Bajas Emisiones (ZBE) en España: Guía Completa 2026",
    summary:
      "Qué son las ZBE, qué ciudades las tienen, qué vehículos pueden circular y cómo consultar las restricciones.",
    category: "GUIDE" as const,
    readTime: "8 min",
    tags: ["zbe", "etiqueta-ambiental", "dgt", "normativa"],
    publishedAt: new Date("2026-03-24"),
    body: `## ¿Qué es una Zona de Bajas Emisiones?

Una Zona de Bajas Emisiones (ZBE) es un área urbana donde se restringe el acceso de los vehículos más contaminantes. Reguladas por la **Ley de Cambio Climático** (7/2021), son obligatorias para todos los municipios de más de 50.000 habitantes desde 2023.

El objetivo es reducir la contaminación del aire, el ruido y las emisiones de gases de efecto invernadero en las ciudades.

## ¿Qué ciudades tienen ZBE en 2026?

Las principales ZBE activas en España:

- **Madrid:** Madrid 360 — la más restrictiva del país
- **Barcelona:** ZBE Rondes — afecta a toda el área metropolitana
- **Granada:** Centro histórico
- **Málaga:** Casco antiguo
- **Zaragoza:** Centro urbano
- **Sevilla:** Casco antiguo
- **Valencia:** Área central
- **Valladolid:** Centro
- **Vitoria-Gasteiz:** Superilla
- **Sabadell:** Centro urbano

## ¿Qué vehículos pueden circular?

El acceso depende del **distintivo ambiental** de la DGT:

- **CERO (azul):** Acceso libre a todas las ZBE
- **ECO (azul-verde):** Acceso libre a todas las ZBE
- **C (verde):** Acceso permitido en la mayoría de ZBE
- **B (amarillo):** Restringido en muchas ZBE (consultar cada ciudad)
- **Sin etiqueta:** Prohibido en casi todas las ZBE

Consulta tu [etiqueta ambiental](/etiqueta-ambiental) para saber qué distintivo tiene tu vehículo.

## Multas por entrar sin permiso

La multa por acceder a una ZBE sin el distintivo requerido es de **200 €** (100 € con pronto pago). El control se realiza mediante cámaras de lectura de matrículas.

## Consulta las ZBE en trafico.live

- [Explorar infraestructura](/explorar/infraestructura) — mapa de ZBE activas
- [Etiqueta ambiental](/etiqueta-ambiental) — consulta tu distintivo
- [Cargadores eléctricos](/carga-ev) — puntos de carga cerca de ti

---

*Fuente: DGT, Ley 7/2021 de Cambio Climático.*`,
  },
  {
    slug: "como-ahorrar-gasolina-consejos",
    title: "10 Consejos para Ahorrar Gasolina en 2026",
    summary:
      "Técnicas de conducción eficiente, mantenimiento del vehículo y herramientas para encontrar el combustible más barato.",
    category: "GUIDE" as const,
    readTime: "6 min",
    tags: ["conduccion-eficiente", "precio-combustible", "gasolina", "diesel"],
    publishedAt: new Date("2026-03-24"),
    body: `## 10 consejos para reducir tu gasto en combustible

Con los precios del combustible en constante fluctuación, aplicar técnicas de conducción eficiente puede ahorrarte entre un **15% y un 25%** del gasto anual en gasolina o diésel.

### 1. Conduce de forma suave

Evita acelerones y frenazos bruscos. La conducción agresiva puede incrementar el consumo hasta un **33%** en carretera y un **5%** en ciudad.

### 2. Mantén una velocidad constante

Usa el control de crucero en autopista. Cada 10 km/h por encima de 100 km/h incrementa el consumo un **7-14%**.

### 3. Revisa la presión de los neumáticos

Los neumáticos desinflados aumentan la resistencia a la rodadura. Mantenerlos a la presión correcta ahorra hasta un **3%** de combustible.

### 4. Reduce el peso innecesario

Cada 50 kg extra incrementan el consumo un **2%**. Vacía el maletero de lo que no necesites.

### 5. Usa el aire acondicionado con moderación

El A/C consume entre un **5% y un 10%** más de combustible. En ciudad, abre las ventanillas. En autopista, usa el A/C (las ventanillas abiertas crean resistencia aerodinámica).

### 6. Planifica tu ruta

Evita atascos y recorridos innecesarios. Consulta las [incidencias de tráfico](/incidencias) antes de salir.

### 7. Apaga el motor en paradas largas

Si vas a estar parado más de 60 segundos, apaga el motor. Los coches modernos con Start/Stop lo hacen automáticamente.

### 8. Usa marchas largas

Cambia de marcha entre 1.500-2.000 rpm en diésel y 2.000-2.500 rpm en gasolina. Las marchas largas a baja velocidad reducen el consumo.

### 9. Haz mantenimiento regular

Un filtro de aire sucio puede aumentar el consumo un **10%**. Cambia el aceite según las indicaciones del fabricante.

### 10. Busca la gasolinera más barata

Usa [gasolineras baratas](/gasolineras/baratas) para encontrar los mejores precios cerca de ti. La diferencia entre la más cara y la más barata puede ser de **0,20 €/L**.

## Herramientas útiles

- [Precio gasolina hoy](/precio-gasolina-hoy) — media nacional actualizada
- [Precio diésel hoy](/precio-diesel-hoy) — media nacional actualizada
- [Calculadora de coste](/calculadora) — calcula cuánto te costará un viaje
- [Gasolineras baratas](/gasolineras/baratas) — las más económicas cerca de ti

---

*Fuente: IDAE, DGT.*`,
  },
  {
    slug: "diesel-o-gasolina-2026",
    title: "¿Diesel o Gasolina en 2026? Guía Completa para Elegir",
    summary:
      "Comparativa actualizada: precios, consumo, fiscalidad, restricciones ZBE y tabla de decisión para saber qué motorización te conviene en 2026.",
    category: "GUIDE" as const,
    readTime: "7 min",
    tags: ["diesel", "gasolina", "precio-combustible", "zbe", "etiqueta-ambiental"],
    publishedAt: new Date("2026-03-24"),
    body: `## Diésel vs Gasolina en 2026: ¿cuál elegir?

La decisión entre diésel y gasolina depende de tu perfil de uso. En 2026, las variables clave son el **precio del combustible**, las **restricciones ZBE**, la **fiscalidad** y el **kilometraje anual**.

## Precio actual

- **Gasóleo A:** Consulta el [precio diésel hoy](/precio-diesel-hoy)
- **Gasolina 95:** Consulta el [precio gasolina hoy](/precio-gasolina-hoy)

Históricamente el diésel era más barato, pero la brecha se ha reducido. Compara precios actualizados en [precios por provincia](/gasolineras/precios).

## Consumo medio

- **Diésel:** 5-7 L/100km (más eficiente en carretera)
- **Gasolina:** 6-9 L/100km (mejor en ciudad para trayectos cortos)

El diésel sigue siendo más eficiente en **consumo por kilómetro**, especialmente en carretera y con vehículos pesados.

## Restricciones ZBE

- Los vehículos diésel anteriores a 2006 (Euro 4) **no tienen etiqueta ambiental** y no pueden entrar en ninguna ZBE
- Los diésel Euro 5 (2006-2014) tienen **etiqueta B** y están restringidos en algunas ZBE
- Los diésel Euro 6 (2014+) tienen **etiqueta C** y pueden circular en la mayoría de ZBE

Consulta tu [etiqueta ambiental](/etiqueta-ambiental) y las [zonas ZBE activas](/explorar/infraestructura).

## ¿Cuándo conviene diésel?

- Recorres **más de 20.000 km/año**
- Conduces principalmente por **carretera/autopista**
- Tu vehículo es Euro 6 o posterior
- No vives en una ciudad con ZBE restrictiva

## ¿Cuándo conviene gasolina?

- Recorres **menos de 15.000 km/año**
- Conduces principalmente por **ciudad**
- Quieres un vehículo **más barato** de adquisición
- El coste de mantenimiento importa (el diésel es más caro de mantener)

## Alternativas: eléctrico e híbrido

Si tu perfil incluye muchos kilómetros urbanos, considera un vehículo eléctrico o híbrido:

- Etiqueta **CERO** o **ECO** — acceso libre a todas las ZBE
- Consulta los [puntos de carga](/carga-ev) cerca de ti
- Calcula [cuánto cuesta cargar](/cuanto-cuesta-cargar) un eléctrico

---

*Datos actualizados a marzo 2026. Fuente: MITERD, DGT.*`,
  },
  {
    slug: "nuevos-radares-dgt-2026",
    title: "33 Nuevos Radares DGT en 2026: Ubicaciones y Tipos",
    summary:
      "La DGT instala 33 nuevos cinemómetros en 2026. Descubre qué tipos de radar hay, las carreteras afectadas y cómo funciona el radar de tramo.",
    category: "NEWS" as const,
    readTime: "6 min",
    tags: ["radares", "dgt", "seguridad-vial"],
    publishedAt: new Date("2026-03-24"),
    body: `## 33 nuevos radares DGT en 2026

La DGT ha anunciado la instalación de **33 nuevos cinemómetros** a lo largo de 2026, reforzando la red de control de velocidad en las carreteras españolas. Actualmente España cuenta con más de **800 radares fijos** y **545 radares de tramo**.

## Tipos de radar en España

### Radares fijos (cinemómetros)

Instalados en un punto concreto de la vía. Miden la velocidad instantánea del vehículo al pasar. Son los más numerosos.

### Radares de tramo

Calculan la **velocidad media** entre dos puntos. Son más difíciles de evadir porque no basta con frenar puntualmente. Hay más de 80 tramos controlados.

### Radares móviles

Colocados en vehículos camuflados (Pegasus) o trípodes en arcenes. No tienen ubicación fija y se mueven según los planes de la DGT.

### Helicóptero Pegasus

Detecta infracciones desde el aire: velocidad excesiva, uso del móvil, no respetar distancia de seguridad, y adelantamientos indebidos.

## ¿Dónde están los nuevos radares?

La DGT prioriza la instalación en:

- Carreteras convencionales con alta siniestralidad
- Tramos de autovía con historial de exceso de velocidad
- Túneles y travesías urbanas
- Zonas cercanas a colegios y hospitales

Consulta el [mapa de radares](/radares) para ver las ubicaciones actualizadas de todos los radares en España.

## Multas por exceso de velocidad

- **Hasta 20 km/h por encima:** 100 €
- **De 21 a 30 km/h:** 300 €
- **De 31 a 40 km/h:** 400 €
- **De 41 a 50 km/h:** 500 €
- **Más de 50 km/h:** 600 € + posible pérdida del permiso

## Consulta el tráfico

- [Radares DGT](/radares) — todas las ubicaciones
- [Mapa de incidencias](/incidencias) — estado del tráfico
- [Cámaras DGT](/camaras) — imágenes en directo

---

*Fuente: DGT, Plan Estratégico de Seguridad Vial 2024-2030.*`,
  },
  {
    slug: "etiqueta-ambiental-dgt-como-saber",
    title: "Etiqueta Ambiental DGT: Cómo Saber la Tuya y Qué Significa",
    summary:
      "Guía completa sobre las 5 etiquetas ambientales DGT: qué vehículos las tienen, cómo consultar la tuya en miDGT, qué permite circular en las ZBE y las multas vigentes.",
    category: "GUIDE" as const,
    readTime: "8 min",
    tags: ["etiqueta-ambiental", "zbe", "dgt", "normativa"],
    publishedAt: new Date("2026-03-24"),
    body: `## Las 5 etiquetas ambientales DGT

El sistema de etiquetas ambientales clasifica los vehículos según su nivel de emisiones. Esta clasificación determina el acceso a las Zonas de Bajas Emisiones (ZBE) y puede afectar a beneficios fiscales, aparcamiento y circulación.

### CERO (azul)

- Vehículos eléctricos puros (BEV)
- Híbridos enchufables (PHEV) con autonomía eléctrica >40 km
- Vehículos de hidrógeno (FCEV)
- **Ventajas:** Acceso libre a todas las ZBE, descuentos en peajes, aparcamiento regulado gratuito en muchas ciudades

### ECO (azul y verde)

- Híbridos no enchufables (HEV)
- Vehículos propulsados por GNC, GNL o GLP
- **Ventajas:** Acceso a la mayoría de ZBE, descuentos parciales en aparcamiento

### C (verde)

- Gasolina desde Euro 4 (matriculados desde 2006)
- Diésel desde Euro 6 (matriculados desde 2014)
- **Ventajas:** Acceso a la mayoría de ZBE con restricciones horarias en algunos casos

### B (amarillo)

- Gasolina desde Euro 3 (matriculados desde 2001)
- Diésel desde Euro 4 (matriculados desde 2006) y Euro 5
- **Restricciones:** Acceso limitado o prohibido en varias ZBE

### Sin etiqueta

- Gasolina anterior a Euro 3 (antes de 2001)
- Diésel anterior a Euro 4 (antes de 2006)
- **Restricciones:** Prohibido circular en todas las ZBE

## Cómo consultar tu etiqueta

1. **App miDGT:** La forma más rápida. Descarga la app oficial de la DGT, identifícate con Cl@ve o certificado digital, y consulta la ficha de tu vehículo
2. **Web DGT:** En sede.dgt.gob.es puedes consultar con tu matrícula
3. **Correos:** Puedes solicitar el envío de la pegatina física en cualquier oficina de Correos

## Multas por circular sin etiqueta en ZBE

- **200 €** por acceder a una ZBE sin el distintivo requerido (100 € con pronto pago)
- El control se realiza mediante **cámaras de lectura de matrículas**
- Algunas ciudades (Madrid, Barcelona) aplican sanciones adicionales

## Herramientas útiles

- [Consulta tu etiqueta ambiental](/etiqueta-ambiental) — comprueba qué distintivo tiene tu vehículo
- [Zonas ZBE](/explorar/infraestructura) — mapa de zonas de bajas emisiones
- [Cargadores EV](/carga-ev) — si estás pensando en pasarte al eléctrico

---

*Fuente: DGT, Ley 7/2021 de Cambio Climático.*`,
  },
];

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Seeding tags...");

  for (const tag of TAGS) {
    await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: { name: tag.name },
      create: tag,
    });
  }

  console.log(`  ${TAGS.length} tags seeded`);

  console.log("Migrating blog articles...");

  for (const article of BLOG_ARTICLES) {
    const existing = await prisma.article.findUnique({
      where: { slug: article.slug },
    });

    if (existing) {
      console.log(`  Skip (exists): ${article.slug}`);
      continue;
    }

    const created = await prisma.article.create({
      data: {
        slug: article.slug,
        title: article.title,
        summary: article.summary,
        body: article.body,
        category: article.category,
        status: "PUBLISHED",
        source: "trafico.live",
        isAutoGenerated: false,
        featured: false,
        readTime: article.readTime,
        publishedAt: article.publishedAt,
      },
    });

    // Attach tags
    const tagRecords = await prisma.tag.findMany({
      where: { slug: { in: article.tags } },
    });

    if (tagRecords.length > 0) {
      await prisma.articleTag.createMany({
        data: tagRecords.map((t) => ({
          articleId: created.id,
          tagId: t.id,
        })),
        skipDuplicates: true,
      });
    }

    console.log(`  Created: ${article.slug} (${tagRecords.length} tags)`);
  }

  console.log("Done!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
