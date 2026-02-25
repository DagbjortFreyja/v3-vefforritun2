import { Hono } from "hono";
import * as z from "zod";
import { prisma } from "../prisma.js";
import { zValidator } from "@hono/zod-validator";
import xss from "xss";

export const app = new Hono();

// paging: ?limit=10&offset=0
const pagingSchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(10),
  offset: z.coerce.number().min(0).max(100000).optional().default(0),
});

// body schemas
const createNewsSchema = z.object({
  title: z.string().trim().min(1).max(200),
  excerpt: z.string().trim().min(1).max(500),
  content: z.string().trim().min(1),
  authorId: z.coerce.number().int().positive(),
  published: z.coerce.boolean().optional().default(false),
  slug: z.string().trim().min(1).max(200).optional(),
});

const updateNewsSchema = createNewsSchema.partial();

// tiny slugify helper (no extra deps)
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 200);
}

// GET /news (paginated)
app.get("/", zValidator("query", pagingSchema), async (c) => {
  const { limit, offset } = c.req.valid("query");

  try {
    const [data, total] = await Promise.all([
      prisma.news.findMany({
        skip: offset,
        take: limit,
        orderBy: { id: "desc" }, // "nýjustu" í einfaldri mynd
        include: { author: true },
      }),
      prisma.news.count(),
    ]);

    return c.json({
      data,
      paging: { limit, offset, total },
    });
  } catch (e) {
    console.error(e);
    return c.json({ error: "internal error" }, 500);
  }
});

// GET /news/:slug
app.get("/:slug", async (c) => {
  const slug = c.req.param("slug");

  try {
    const news = await prisma.news.findUnique({
      where: { slug },
      include: { author: true },
    });

    if (!news) {
      return c.json({ error: "not found" }, 404);
    }

    return c.json(news);
  } catch (e) {
    console.error(e);
    return c.json({ error: "internal error" }, 500);
  }
});

// POST /news
app.post("/", zValidator("json", createNewsSchema), async (c) => {
  const body = c.req.valid("json");

  const safeTitle = xss(body.title);
  const safeExcerpt = xss(body.excerpt);
  const safeContent = xss(body.content);

  const slug = body.slug ? slugify(body.slug) : slugify(safeTitle);

  try {
    // optional: ensure author exists
    const author = await prisma.author.findUnique({
      where: { id: body.authorId },
      select: { id: true },
    });

    if (!author) {
      return c.json({ error: "author not found" }, 400);
    }

    const created = await prisma.news.create({
      data: {
        title: safeTitle,
        excerpt: safeExcerpt,
        content: safeContent,
        slug,
        published: body.published,
        authorId: body.authorId,
      },
      include: { author: true },
    });

    return c.json(created, 201);
  } catch (e: any) {
    // Prisma unique constraint violation (slug)
    if (e?.code === "P2002") {
      return c.json({ error: "slug already exists" }, 400);
    }
    console.error(e);
    return c.json({ error: "internal error" }, 500);
  }
});

// PUT /news/:slug
app.put("/:slug", zValidator("json", updateNewsSchema), async (c) => {
  const slugParam = c.req.param("slug");
  const body = c.req.valid("json");

  const data: {
    title?: string;
    excerpt?: string;
    content?: string;
    published?: boolean;
    authorId?: number;
    slug?: string;
  } = {};

  if (body.title !== undefined) data.title = xss(body.title);
  if (body.excerpt !== undefined) data.excerpt = xss(body.excerpt);
  if (body.content !== undefined) data.content = xss(body.content);
  if (body.published !== undefined) data.published = body.published;
  if (body.authorId !== undefined) data.authorId = body.authorId;
  if (body.slug !== undefined) data.slug = slugify(body.slug);

  try {
    const existing = await prisma.news.findUnique({
      where: { slug: slugParam },
      select: { id: true },
    });

    if (!existing) {
      return c.json({ error: "not found" }, 404);
    }

    // optional: validate author if changed
    if (data.authorId !== undefined) {
      const author = await prisma.author.findUnique({
        where: { id: data.authorId },
        select: { id: true },
      });
      if (!author) {
        return c.json({ error: "author not found" }, 400);
      }
    }

    const updated = await prisma.news.update({
      where: { slug: slugParam },
      data,
      include: { author: true },
    });

    return c.json(updated);
  } catch (e: any) {
    if (e?.code === "P2002") {
      return c.json({ error: "slug already exists" }, 400);
    }
    console.error(e);
    return c.json({ error: "internal error" }, 500);
  }
});

// DELETE /news/:slug
app.delete("/:slug", async (c) => {
  const slug = c.req.param("slug");

  try {
    const existing = await prisma.news.findUnique({
      where: { slug },
      select: { id: true },
    });

    if (!existing) {
      return c.json({ error: "not found" }, 404);
    }

    await prisma.news.delete({ where: { slug } });
    return c.body(null, 204);
  } catch (e) {
    console.error(e);
    return c.json({ error: "internal error" }, 500);
  }
});