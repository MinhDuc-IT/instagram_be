// src/core/email/providers/aws-ses.provider.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SES } from '@aws-sdk/client-ses';
import { SendEmailRequest } from '@aws-sdk/client-ses';
import { EmailPayload } from '../interfaces/email.interface';

@Injectable()
export class AwsSesProvider {
  private readonly logger = new Logger(AwsSesProvider.name);
  private readonly ses: SES;

  constructor(private readonly configService: ConfigService) {
    this.ses = new SES({
      region: this.configService.get<string>('AWS_REGION'),
      credentials: {
        accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') ?? '',
        secretAccessKey:
          this.configService.get<string>('AWS_SECRET_ACCESS_KEY') ?? '',
      },
    });
  }

  /**
   * Send email using AWS SES
   */
  async sendEmail(payload: EmailPayload): Promise<{ messageId: string }> {
    try {
      const params: SendEmailRequest = {
        Source: payload.sender,
        Destination: {
          ToAddresses: payload.recipients,
        },
        Message: {
          Subject: {
            Data: payload.subject,
            Charset: 'UTF-8',
          },
          Body: payload.isHtml
            ? {
                Html: {
                  Data: payload.body,
                  Charset: 'UTF-8',
                },
              }
            : {
                Text: {
                  Data: payload.body,
                  Charset: 'UTF-8',
                },
              },
        },
      };

      const result = await this.ses.sendEmail(params);
      return { messageId: result.MessageId ?? '' };
    } catch (error) {
      this.logger.error(`AWS SES error: ${error.message}`, error.stack);
      throw new Error(`Failed to send email via AWS SES: ${error.message}`);
    }
  }
}
