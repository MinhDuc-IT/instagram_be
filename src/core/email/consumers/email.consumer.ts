// src/core/email/consumers/email.consumer.ts
import { Injectable, Logger } from '@nestjs/common';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { AwsSesProvider } from '../providers/aws-ses.provider';
import { SmtpProvider } from '../providers/smtp.provider';
// import { EmailLoggerService } from '../logger/email-logger.service';
// import { JobService } from '../jobs/job.service';
import { EmailStatus } from '../constants/email.enum';

@Injectable()
export class EmailConsumer {
  private readonly logger = new Logger(EmailConsumer.name);

  constructor(
    // private readonly sesProvider: AwsSesProvider,
    private readonly smtpProvider: SmtpProvider,
    // private readonly emailLogger: EmailLoggerService,
    // private readonly jobService: JobService,
  ) {}

  @RabbitSubscribe({
    exchange: 'email',
    routingKey: 'email.send',
    queue: 'email_send_queue',
  })
  async handleEmailSending(message: any): Promise<void> {
    try {
      this.logger.log(`Processing email to ${message.recipients.join(', ')}`);

      // Send email using AWS SES
    //   const result = await this.sesProvider.sendEmail({
    //     sender: message.sender,
    //     recipients: message.recipients,
    //     subject: message.subject,
    //     body: message.body,
    //     isHtml: message.isHtml || false,
    //     attachments: message.attachments,
    //   });

        // Send email using smtp provider
        const result = await this.smtpProvider.sendEmail({
            sender: message.sender,
            recipients: message.recipients,
            subject: message.subject,
            body: message.body,
            isHtml: message.isHtml || false,
            attachments: message.attachments,
        });

      // Log success
    //   await this.emailLogger.logEmailResult({
    //     messageId: result.messageId,
    //     recipients: message.recipients,
    //     subject: message.subject,
    //     status: EmailStatus.SENT,
    //     job: message.jobId,
    //   });

      // Update job status if this was a scheduled email
    //   if (message.jobId) {
    //     await this.jobService.updateJobStatus(message.jobId, EmailStatus.SENT);
    //   }

      this.logger.log(`Successfully sent email with ID: ${result.messageId}`);
    } catch (error) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);

      // Log failure
    //   await this.emailLogger.logEmailResult({
    //     recipients: message.recipients,
    //     subject: message.subject,
    //     status: EmailStatus.FAILED,
    //     job: message.jobId,
    //     errorMessage: error.message,
    //   });

    //   // Update job status if this was a scheduled email
    //   if (message.jobId) {
    //     await this.jobService.updateJobStatus(
    //       message.jobId,
    //       EmailStatus.FAILED,
    //     );
    //   }
    }
  }
}
