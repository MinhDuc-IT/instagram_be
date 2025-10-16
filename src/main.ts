import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ZodValidationPipe } from 'nestjs-zod';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: [
      'http://localhost:3000',
    ],
    credentials: true,
    allowedHeaders: 'Content-Type, Authorization, Cookie',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });
  app.use(cookieParser());
  app.useGlobalPipes(new ZodValidationPipe());
  const config = new DocumentBuilder()
    .setTitle('Instagram API')
    .setDescription('Api system for instagram')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .setVersion('1.0')
    .addCookieAuth(
      'sb-csso-auth-token',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'sb-csso-auth-token',
      },
      'cookie-auth', // Tên của security scheme
    )
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, documentFactory);
  await app.listen(process.env.PORT ?? 8080);
}
bootstrap();
