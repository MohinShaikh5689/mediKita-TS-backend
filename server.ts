import fastify from "fastify";
import dotenv from "dotenv";
import cors from "@fastify/cors";
import { doctorsRoutes } from "./routes/doctorsRoutes.ts";
import { adminsRoutes } from "./routes/AdminsRoutes.ts";
import { formRoutes } from "./routes/FormRoutes.ts";
import { articlesRoute } from "./routes/ArticlesRoute.ts";
import { userRoute } from "./routes/userRoute.ts";
import multipart from "@fastify/multipart";

dotenv.config();
const PORT = Number(process.env.PORT) || 3000;
const app = fastify();

await app.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
});
await app.register(multipart, {
    limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
        files: 5 
    }
});

app.get('/', async (request, reply) => {
    return { hello: 'world' }
});

app.register(doctorsRoutes, { prefix: '/api/v1' });
app.register(adminsRoutes, { prefix: '/api/v1' });
app.register(formRoutes, { prefix: '/api/v1' });
app.register(articlesRoute, { prefix: '/api/v1' }); 
app.register(userRoute, { prefix: '/api/v1' });

const start = async () => {
    try {
        await app.listen({ port: PORT, host: '0.0.0.0' })
        console.log(`Server listening on http://localhost:${PORT}`)
    } catch (err) {
        app.log.error(err)
        process.exit(1)
    }
}

start()



