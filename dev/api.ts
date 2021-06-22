import { createServer, Model, Factory, Response } from 'miragejs'
import { Article } from './types'
import { lorem } from "faker";

export default function useApiStub(){
    return createServer({
        models: {
            article: Model.extend<Partial<Article>>({})
        },
        factories: {
            article: Factory.extend<Partial<Article>>({
              get title() {
                  return lorem.sentence(5).replaceAll('.', '')
              },
              get body() {
                  return lorem.paragraphs(5)
              }
            })
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
            this.put('/api/article/:id', (schema, request) => {
                const { id } = request.params
                const article = schema.find('article', id)
                if(article) {
                    article.update(JSON.parse(request.requestBody))
                    return new Response(204)
                }
                return new Response(404)
            })
            this.post('/api/article', (schema, request) => {
                const article = schema.create('article', JSON.parse(request.requestBody))
                return new Response(201, {'Location': '/api/article/' + article.id})
            })
        },
    })
}