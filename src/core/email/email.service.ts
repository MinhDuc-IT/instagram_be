// src/core/email/email.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
// import { JobService } from './jobs/job.service';
import { SendEmailDto } from './dto/send-email.dto';
import { ScheduleEmailDto } from './dto/schedule-email.dto';
import { EmailPriority, EmailStatus } from './constants/email.enum';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly defaultSender: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly amqpConnection: AmqpConnection,
    // private readonly jobService: JobService,
  ) {
    // TODO: Use a more secure way to handle default sender
    this.defaultSender =
      this.configService.get<string>('EMAIL_DEFAULT_SENDER') ?? '';
  }

  /**
   * Send an email immediately
   */
  async sendEmail(emailDto: SendEmailDto): Promise<string> {
    try {
      // Publish to RabbitMQ for immediate processing
      await this.amqpConnection.publish('email', 'email.send', {
        ...emailDto,
        sender: emailDto.sender || this.defaultSender,
        priority: emailDto.priority || EmailPriority.NORMAL,
        timestamp: new Date().toISOString(),
      });

      this.logger.log(
        `Email queued for sending to ${emailDto.recipients.join(', ')}`,
      );
      return 'Email queued successfully';
    } catch (error) {
      this.logger.error(`Failed to queue email: ${error.message}`, error.stack);
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Schedule an email for future delivery
   */
  // async scheduleEmail(scheduleDto: ScheduleEmailDto): Promise<string> {
  //   try {
  //     // Create job in database using JobService
  //     // TODO: fix types, error types JSON cannot convert into array
  //     // @ts-expect-error - plz read the comment
  //     const jobId = await this.jobService.createJob({
  //       ...scheduleDto.emailData,
  //       sender: scheduleDto.emailData.sender || this.defaultSender,
  //       scheduledFor: scheduleDto.scheduledFor,
  //       status: EmailStatus.SCHEDULED,
  //     });

  //     this.logger.log(
  //       `Email scheduled for ${new Date(scheduleDto.scheduledFor).toISOString()}`,
  //     );
  //     return jobId;
  //   } catch (error) {
  //     this.logger.error(
  //       `Failed to schedule email: ${error.message}`,
  //       error.stack,
  //     );
  //     throw new Error(`Failed to schedule email: ${error.message}`);
  //   }
  // }

  /**
   * Cancel a scheduled email
   */
  // cancelScheduledEmail(jobId: string): Promise<boolean> {
  //   return this.jobService.cancelJob(jobId);
  // }

  /**
   * Process scheduled emails (called by cron or scheduler)
   */
  // async processScheduledEmails(): Promise<void> {
  //   try {
  //     const dueJobs = await this.jobService.getDueJobs();

  //     for (const job of dueJobs) {
  //       await this.amqpConnection.publish('email', 'email.send', {
  //         sender: job.sender,
  //         recipients: job.recipients,
  //         subject: job.subject,
  //         body: job.body,
  //         isHtml: job.isHtml,
  //         attachments: job.attachments,
  //         priority: job.priority,
  //         jobId: job.id,
  //         timestamp: new Date().toISOString(),
  //       });

  //       await this.jobService.updateJobStatus(job.id, EmailStatus.PROCESSING);
  //     }

  //     this.logger.log(`Processed ${dueJobs.length} scheduled emails`);
  //   } catch (error) {
  //     this.logger.error(
  //       `Error processing scheduled emails: ${error.message}`,
  //       error.stack,
  //     );
  //   }
  // }
}
