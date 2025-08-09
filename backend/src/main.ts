import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const prefix = `${config.get('API_PREFIX')}/${config.get('API_VERSION')}`;
  app.setGlobalPrefix(prefix);
  await app.listen(config.get('PORT') || 3000);
}
bootstrap();
