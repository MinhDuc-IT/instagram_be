import {
  IsEmail,
  IsString,
  IsArray,
  IsOptional,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EmailPriority } from '../constants/email.enum';

export class AttachmentDto {
  @IsString()
  filename: string;

  @IsString()
  content: string;

  @IsString()
  @IsOptional()
  contentType?: string;
}

export class SendEmailDto {
  @IsEmail()
  @IsOptional()
  sender?: string;

  @IsArray()
  @IsEmail({}, { each: true })
  recipients: string[];

  @IsString()
  subject: string;

  @IsString()
  body: string;

  @IsBoolean()
  @IsOptional()
  isHtml?: boolean = false;

  @IsArray()
  @IsOptional()
  @Type(() => AttachmentDto)
  attachments?: AttachmentDto[];

  @IsEnum(EmailPriority)
  @IsOptional()
  priority?: EmailPriority = EmailPriority.NORMAL;
}
