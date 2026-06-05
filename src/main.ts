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
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 4000);
}
bootstrap();
