// // src/core/email/jobs/job.service.ts
// import { Injectable, Logger } from '@nestjs/common';
// import { PrismaService } from '../../prisma/prisma.service';
// import { EmailStatus } from '../constants/email.enum';
// import { Prisma } from '@prisma/client';

// @Injectable()
// export class JobService {
//   private readonly logger = new Logger(JobService.name);

//   constructor(private readonly prisma: PrismaService) {}

//   /**
//    * Create a new email job
//    */
//   async createJob(jobData: Prisma.EmailJobCreateInput): Promise<string> {
//     try {
//       const newJob = await this.prisma.emailJob.create({
//         data: jobData,
//       });
//       return newJob.id;
//     } catch (error) {
//       this.logger.error(`Failed to create job: ${error.message}`, error.stack);
//       throw new Error(`Failed to create job: ${error.message}`);
//     }
//   }

//   /**
//    * Get all jobs that are due for processing
//    */
//   async getDueJobs() {
//     const now = new Date();
//     return this.prisma.emailJob.findMany({
//       where: {
//         scheduledFor: { lte: now },
//         status: EmailStatus.SCHEDULED,
//       },
//     });
//   }

//   /**
//    * Update job status
//    */
//   async updateJobStatus(jobId: string, status: EmailStatus): Promise<void> {
//     await this.prisma.emailJob.update({
//       where: { id: jobId },
//       data: {
//         status,
//         updatedAt: new Date(),
//       },
//     });
//   }

//   /**
//    * Cancel a scheduled job
//    */
//   async cancelJob(jobId: string): Promise<boolean> {
//     try {
//       const result = await this.prisma.emailJob.update({
//         where: { id: jobId },
//         data: {
//           status: EmailStatus.CANCELLED,
//           updatedAt: new Date(),
//         },
//       });

//       return !!result;
//     } catch (error) {
//       this.logger.error(
//         `Failed to cancel job ${jobId}: ${error.message}`,
//         error.stack,
//       );
//       return false;
//     }
//   }
// }
