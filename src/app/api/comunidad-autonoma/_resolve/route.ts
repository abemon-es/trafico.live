import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Internal slug resolver for middleware redirects.
 * Resolves municipality slugs and province codes to /espana/... paths.
 *
 * GET /api/comunidad-autonoma/_resolve?slug=valladolid
 * GET /api/comunidad-autonoma/_resolve?slug=_province:47
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }

  try {
    // Province code resolution: _province:47 → /espana/{community}/{province}
    if (slug.startsWith("_province:")) {
      const code = slug.replace("_province:", "");
      const province = await prisma.province.findUnique({
        where: { code },
        include: { community: { select: { slug: true } } },
      });
      if (province) {
        return NextResponse.json({
          path: `/espana/${province.community.slug}/${province.slug}`,
        });
      }
      return NextResponse.json({ path: null }, { status: 404 });
    }

    // Municipality slug resolution: valladolid → /espana/{community}/{province}/{municipality}
    const municipality = await prisma.municipality.findUnique({
      where: { slug },
      include: {
        province: {
          include: { community: { select: { slug: true } } },
        },
      },
    });

    if (municipality) {
      return NextResponse.json({
        path: `/espana/${municipality.province.community.slug}/${municipality.province.slug}/${municipality.slug}`,
      });
    }

    return NextResponse.json({ path: null }, { status: 404 });
  } catch {
    return NextResponse.json({ error: "lookup failed" }, { status: 500 });
  }
}
