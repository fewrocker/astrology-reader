import express from 'express';
import authRouter from './routes/auth';

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server on port ${PORT}`));
export default app;
