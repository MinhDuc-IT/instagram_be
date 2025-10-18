// src/core/email/email.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { PrismaService } from '../prisma/prisma.service';
import { SmtpProvider } from './providers/smtp.provider';
import { EmailConsumer } from './consumers/email.consumer';

@Global()
@Module({
  imports: [
    ConfigModule,
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri:
          configService.get<string>('RABBITMQ_URL') ??
          'amqps://uiwocgzh:gHzl9Zb89edQxwP3d4OC3qr7oypTWu44@fuji.lmq.cloudamqp.com/uiwocgzh',
        exchanges: [
          {
            name: 'email',
            type: 'topic',
            options: { durable: true },
          },
        ],
        connectionInitOptions: {
          wait: false, // Don't block application startup
        },
        reconnectStrategy: {
          retryAttempts: 15,
          retryDelay: 3000, // 3 seconds between attempts
        },
      }),
    }),
  ],
  providers: [PrismaService, SmtpProvider, EmailConsumer],
  exports: [RabbitMQModule],
})
export class EmailModule {}
