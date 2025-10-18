import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class SmtpProvider {
    private readonly logger = new Logger(SmtpProvider.name);
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: Number(process.env.SMTP_PORT) || 587,
            secure: false, // true nếu dùng port 465
            auth: {
                user: process.env.SMTP_USER, 
                pass: process.env.SMTP_PASS,
            },
        });
    }

    async sendEmail(options: {
        sender?: string;
        recipients: string[];
        subject: string;
        body: string;
        isHtml?: boolean;
        attachments?: any[];
    }) {
        try {
            const mailOptions = {
                from: options.sender || process.env.SMTP_USER,
                to: options.recipients.join(', '),
                subject: options.subject,
                [options.isHtml ? 'html' : 'text']: options.body,
                attachments: options.attachments,
            };

            const info = await this.transporter.sendMail(mailOptions);
            this.logger.log(`Email sent: ${info.messageId}`);
            return { messageId: info.messageId };
        } catch (error) {
            this.logger.error(`Failed to send email: ${error.message}`, error.stack);
            throw error;
        }
    }
}
