import { prisma } from '../src/prisma.js'

async function main() {
  
  const authors = await Promise.all([
    prisma.author.upsert({
      where: { email: 'author1@example.org' },
      update: { name: 'author one' },
      create: { email: 'author1@example.org', name: 'author one' },
    }),
    prisma.author.upsert({
      where: { email: 'author2@example.org' },
      update: { name: 'author two' },
      create: { email: 'author2@example.org', name: 'author two' },
    }),
    prisma.author.upsert({
      where: { email: 'author3@example.org' },
      update: { name: 'author three' },
      create: { email: 'author3@example.org', name: 'author three' },
    }),
    prisma.author.upsert({
      where: { email: 'author4@example.org' },
      update: { name: 'author four' },
      create: { email: 'author4@example.org', name: 'author four' },
    }),
  ])

  const newsData = Array.from({ length: 11 }).map((_, i) => {
    const n = i + 1
    return {
      slug: `news-${n}`,
      title: `News title ${n}`,
      excerpt: `This is the excerpt for news ${n}.`,
      content: `This is the full content for news ${n}. Lorem ipsum dolor sit amet...`,
      published: n % 2 === 0,
      authorId: authors[i % authors.length].id, 
    }
  })

  
  for (const item of newsData) {
    await prisma.news.upsert({
      where: { slug: item.slug },
      update: {
        title: item.title,
        excerpt: item.excerpt,
        content: item.content,
        published: item.published,
        authorId: item.authorId,
      },
      create: item,
    })
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })