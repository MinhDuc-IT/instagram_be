import { IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SendEmailDto } from './send-email.dto';

export class ScheduleEmailDto {
  @ValidateNested()
  @Type(() => SendEmailDto)
  emailData: SendEmailDto;

  @IsDateString()
  scheduledFor: Date;
}
