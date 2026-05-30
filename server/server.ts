import "dotenv/config";
import express, { Request, Response } from 'express';
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import userRouter from "./routes/userRoutes.js";
import projectRouter from "./routes/projectRoutes.js";
import { stripeWebhook } from "./controllers/stripeWebook.js";

const app = express();

const port = process.env.PORT || 3000;

const corsOptions = {
    origin: process.env.TRUSTED_ORIGINS?.split(',') || [],
    credentials: true,
}

// Middleware
app.use(cors(corsOptions))
app.post('/api/stripe', express.raw({type: 'application/json'}), stripeWebhook)
app.use(express.json());

app.all('/api/auth/*any', toNodeHandler(auth));

app.use(express.json({limit: '50mb'}))

app.get('/', (req: Request, res: Response) => {
    res.send('Server is Live!');
});

app.get('/api/debug-env', (req: Request, res: Response) => {
    res.json({
        NODE_ENV: process.env.NODE_ENV,
        BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
        TRUSTED_ORIGINS: process.env.TRUSTED_ORIGINS,
        VERCEL: process.env.VERCEL,
        HAS_DATABASE_URL: !!process.env.DATABASE_URL,
        HAS_AI_KEY: !!process.env.AI_API_KEY,
    });
});

app.use('/api/user', userRouter);
app.use('/api/project', projectRouter);

if (!process.env.VERCEL) {
    app.listen(port, () => {
        console.log(`Server is running at http://localhost:${port}`);
    });
}

export default app;