import express from 'express'
import gptRouter from './routes/gpt'

const app = express()
const PORT = parseInt(process.env.PORT ?? '3001', 10)

app.set('trust proxy', 1)
app.use(express.json())

app.use('/api/gpt', gptRouter)

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
