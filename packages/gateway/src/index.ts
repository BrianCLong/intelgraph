import { createServer } from './server'

const port = 4000
createServer().then(app => {
  app.listen(port, () => console.log(`gateway on ${port}`))
})
