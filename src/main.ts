import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
// Triggering reload to ensure service changes are picked up
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '..', 'data'), {
    prefix: '/data/',
  });
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL
        : 'http://localhost:3000',
      'http://192.168.29.243:3000',
      'http://127.0.0.1:3000',
      'https://neetell.in',
      'http://72.61.233.53:3000',
      'http://72.61.233.53:80',
      'http://72.61.233.53:8080',
    ],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
