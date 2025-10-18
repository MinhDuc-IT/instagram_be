// // src/core/email/logger/email-logger.service.ts
// import { Injectable, Logger } from '@nestjs/common';
// import { PrismaService } from '../../../core/prisma/prisma.service';
// import { Prisma } from '@prisma/client';

// @Injectable()
// export class EmailLoggerService {
//   private readonly logger = new Logger(EmailLoggerService.name);

//   constructor(private readonly prisma: PrismaService) {}

//   /**
//    * Log email sending result
//    */
//   async logEmailResult(logData: Prisma.EmailLogCreateInput): Promise<void> {
//     try {
//       await this.prisma.emailLog.create({
//         data: {
//           ...logData,
//           timestamp: new Date(),
//         },
//       });
//     } catch (error) {
//       console.error(`Failed to log email result: ${error.message}`);
//       this.logger.error(
//         `Failed to log email result: ${error.message}`,
//         error.stack,
//       );
//     }
//   }

//   /**
//    * Get logs for a specific job
//    */
//   async getLogsByJobId(jobId: string) {
//     return this.prisma.emailLog.findMany({
//       where: { jobId },
//       orderBy: { timestamp: 'desc' },
//     });
//   }

//   /**
//    * Get logs by recipient
//    */
//   async getLogsByRecipient(email: string, limit = 100) {
//     return this.prisma.emailLog.findMany({
//       where: {
//         recipients: { has: email },
//       },
//       orderBy: { timestamp: 'desc' },
//       take: limit,
//     });
//   }
// }
