import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { ZodValidationPipe } from 'nestjs-zod';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { getQueueToken } from '@nestjs/bull';
import { createBullBoard } from '@bull-board/api';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { UPLOAD_CONSTANTS } from './core/upload/constants/upload.constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS
  app.enableCors({
    origin: ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    allowedHeaders: 'Content-Type, Authorization, Cookie',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  });

  // Middlewares
  app.use(cookieParser());
  app.useGlobalPipes(new ZodValidationPipe());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Instagram API')
    .setDescription('API system for Instagram')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .setVersion('1.0')
    .addBearerAuth()
    .addCookieAuth(
      'sb-csso-auth-token',
      {
        type: 'apiKey',
        in: 'cookie',
        name: 'sb-csso-auth-token',
      },
      'cookie-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // Bull Board
  const uploadQueue = app.get(getQueueToken(UPLOAD_CONSTANTS.QUEUE_NAME));
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/admin/queues');

  createBullBoard({
    queues: [new BullAdapter(uploadQueue)],
    serverAdapter,
  });

  app.use('/admin/queues', serverAdapter.getRouter());

  // Start server
  const port = process.env.PORT ?? 8080;
  await app.listen(port);
  console.log(`🚀 Server is running on http://localhost:${port}`);
  console.log(`📊 Bull Board available at http://localhost:${port}/admin/queues`);
  console.log(`📘 Swagger docs available at http://localhost:${port}/docs`);
}

bootstrap();
