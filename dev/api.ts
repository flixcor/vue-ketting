import { createServer, Model, Factory, Response, Request } from 'miragejs'
import { lorem } from 'faker'
import type { Article } from './types'

const pageSize = 5
function getPage<T>(items: T[], pageNumber: number): { previous?: number; next?: number; page: T[] } {
  const start = (pageNumber - 1) * pageSize
  const end = pageNumber * pageSize
  const pagePlusOne = items.filter((_x, i) => i >= start && i <= end)
  const next = pagePlusOne.length > pageSize ? (pageNumber + 1) : undefined
  const page = pagePlusOne.filter((_x, i) => i < pageSize)
  const previous = pageNumber > 1 ? pageNumber - 1 : undefined
  return {
    page,
    next,
    previous,
  }
}

function parsePageNumber(request: Request): number {
  const parseInt = Number.parseInt(request.queryParams.page, 10)
  return isNaN(parseInt) || parseInt < 1
    ? 1
    : parseInt
}

function shouldEmbed(request: Request): boolean {
  const { prefer } = request.requestHeaders
  return !!prefer && prefer.includes('transclude=item')
}

export default function useApiStub() {
  return createServer({
    models: {
      article: Model.extend<Partial<Article>>({}),
    },
    factories: {
      article: Factory.extend<Record<keyof Article, () => string>>({
        title() {
          return lorem.sentence(5).replaceAll('.', '')
        },
        body() {
          return lorem.paragraphs(5)
        },
      }),
    },
    seeds(server) {
      server.createList('article', 20)
    },
    routes() {
      this.get('/api/article/:id', (schema, request) => {
        const { id } = request.params
        const article = schema.find('article', id)
        return article?.attrs || new Response(404)
      })
      this.get('/api/article', (schema, request) => {
        const pageNumber = parsePageNumber(request)
        const { page, next, previous } = getPage(schema.all('article').models, pageNumber)
        const links = {
          self: { href: `/api/article?page=${pageNumber}` },
          next: next && { href: `/api/article?page=${next}` },
          previous: previous && { href: `/api/article?page=${previous}` },
        }
        return shouldEmbed(request)
          ? {
            _embedded: {
              item: page.map(({ id, title, body }) => ({
                _links: {
                  self: { href: `/api/article/${id}` },
                },
                id,
                title,
                body,
              })),
            },
            _links: links,
          }
          : {
            _links: {
              ...links,
              item: page.map(({ id }) => ({
                href: `/api/article/${id}`,
              })),
            },
          }
      })
      this.put('/api/article/:id', (schema, request) => {
        const { id } = request.params
        const article = schema.find('article', id)
        if (article) {
          article.update(JSON.parse(request.requestBody))
          return new Response(204)
        }
        return new Response(404)
      })
      this.post('/api/article', (schema, request) => {
        const article = schema.create('article', JSON.parse(request.requestBody))
        return new Response(201, { Location: `/api/article/${article.id}` })
      })
    },
  })
}
