import { Hono } from "hono";
import * as z from 'zod'
import { prisma } from "../prisma.js";
import { zValidator } from "@hono/zod-validator";

export const app = new Hono();

const pagingSchema = z.object({
    limit: z.coerce.number().min(1).max(100).optional().default(10),
    offset: z.coerce.number().min(0).optional().default(0)
})

// GET /authors
app.get('/', zValidator('query', pagingSchema), async (c) => {
    try {
        const limit = c.req.valid('query').limit
        const offset = c.req.valid('query').offset

        const authors = await prisma.author.findMany({
            skip: offset,
            take: limit,
            orderBy: { id: 'desc' }
        })

        const total = await prisma.author.count()

        return c.json({
            data: authors,
            paging: {
                limit,
                offset,
                total
            }
        })
    } catch (e) {
        console.error(e)
        return c.json({ error: 'internal error' }, 500)
    }
})

// GET /authors/:id
app.get('/:id', async (c) => {
    try {
        const id = Number(c.req.param('id'));

        const author = await prisma.author.findUnique({
            where: { id },
        });

        if (!author) {
            return c.json({ error: 'not found' }, 404)
        }

        return c.json(author);
    } catch (e) {
        console.error(e)
        return c.json({ error: 'internal error' }, 500)
    }
})

const authorSchema = z.object({
    name: z.string().min(1).max(100),
    email: z.string().email().max(200),
})

// POST /authors
app.post(
    '/',
    zValidator('json', authorSchema),
    async (c) => {
        try {
            const body = c.req.valid('json')

            const author = await prisma.author.create({
                data: body
            })

            return c.json(author, 201)
        } catch (e: any) {
            if (e?.code === 'P2002') {
                return c.json({ error: 'email already exists' }, 400)
            }

            console.error(e)
            return c.json({ error: 'internal error' }, 500)
        }
    }
)

// PUT /authors/:id
app.put(
    '/:id',
    zValidator('json', authorSchema),
    async (c) => {
        try {
            const id = Number(c.req.param('id'))
            const body = c.req.valid('json')

            const existing = await prisma.author.findUnique({
                where: { id }
            })

            if (!existing) {
                return c.json({ error: 'not found' }, 404)
            }

            const updated = await prisma.author.update({
                where: { id },
                data: body
            })

            return c.json(updated)
        } catch (e: any) {
            if (e?.code === 'P2002') {
                return c.json({ error: 'email already exists' }, 400)
            }

            console.error(e)
            return c.json({ error: 'internal error' }, 500)
        }
    }
)

// DELETE /authors/:id
app.delete('/:id', async (c) => {
    try {
        const id = Number(c.req.param('id'));

        const existing = await prisma.author.findUnique({
            where: { id }
        })

        if (!existing) {
            return c.json({ error: 'not found' }, 404)
        }

        await prisma.author.delete({
            where: { id }
        })

        return c.body(null, 204)
    } catch (e) {
        console.error(e)
        return c.json({ error: 'internal error' }, 500)
    }
})
