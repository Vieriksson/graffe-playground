import { json } from 'body-parser'
import * as cors from 'cors'
import * as express from 'express'
import * as graphqlHTTP from 'express-graphql'
import { makeExecutableSchema } from 'graphql-tools'
import * as Raven from 'raven'
import { RAVEN_DSN } from '../config'

Raven.config(RAVEN_DSN).install()

const customers = [
  { id: 1, name: 'Josef', city: 'Stockholm' },
  { id: 2, name: 'Janne', city: 'Karlstad' }
]
const accounts = [
  { cid: 1, account: '123', type: 'PARA' },
  { cid: 1, account: '456', type: 'PARA' },
  { cid: 2, account: '789', type: 'PARA' }
]

const SchemaDefinition = `
  schema {
    query: RootQuery
  }
`

const RootQuery = `
  type RootQuery {
    customer(id: Int!): Customer
  }
`

const Definitions = `
    type Account {
        account: String
        type: String
    }
    type Customer {
        id: Int
        name: String
        city: String
        janne: String
        accounts: [Account]
    }
`

const RootResolver = {
  RootQuery: {
    customer(_, { id }, context) {
      console.log(context.token)
      return customers.find(c => c.id === id)
    }
  },
  Customer: {
    accounts(customer) {
      console.log('AOISDUBHAISUD')
      return accounts.filter(account => account.cid === customer.id)
    }
  }
}

const schema = makeExecutableSchema({
  typeDefs: [SchemaDefinition, RootQuery, Definitions],
  resolvers: RootResolver as any,
  allowUndefinedInResolve: false
})

const formatError = error => {
  const errorObj = new Error(
    JSON.stringify({
      message: error.message || 'This was bad',
      code: (error.originalError && error.originalError.name) || 'Error'
    })
  )
  Raven.captureException(errorObj)
  return errorObj
}

const middleware = (req, res, next) => {
  next()
}

const auth = (req, res, next) => {
  req.token = 'JOSEF'
  next()
}

const errorHandler = (err, req, res, next) => {
  res.status(err.status || 500).send()
}

const app = express()

app.use(Raven.requestHandler())

app.use(
  '/graphql',
  cors(),
  json({ limit: '5kb' }),
  middleware,
  auth,
  graphqlHTTP((req: any) => ({
    schema,
    context: {
      token: req.token
    },
    formatError,
    graphiql: true,
    pretty: true
  }))
)

app.use(Raven.errorHandler())

app.use(errorHandler)

app.listen(4000)
