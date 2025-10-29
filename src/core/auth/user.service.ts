// import { Injectable, Logger } from "@nestjs/common";
// import { PrismaService } from 'src/core/prisma/prisma.service';
// import { CacheService } from "../cache/cache.service";
// import { CacheKeyBuilder } from "src/core/cache/cache.config";
// import { ModuleRef } from '@nestjs/core';

// @Injectable()
// export class UserService {
//     // User service methods would be defined here
//     // private cacheService: CacheService;
//     // private readonly logger = new Logger(UserService.name);

//     constructor(
//         private readonly prisma: PrismaService,
//         // private readonly moduleRef: ModuleRef,
//         private readonly cacheService: CacheService,
//         // private readonly cacheService: CacheService,
//     ) { }

//     onModuleInit() {
//         // this.cacheService = this.moduleRef.get(CacheService, { strict: false });
//         // this.logger.debug(`UserService initialized — cacheService=${!!this.cacheService}`);
//     }

//     async findByEmailOrUsername(email: string, userName: string) {
//         return this.prisma.user.findFirst({
//             where: {
//                 OR: [{ email }, { userName }],
//             },
//         });
//     }

//     async create(userData: {
//         email: string;
//         userName: string;
//         fullName: string;
//         password: string;
//         authId: string;
//         trialExpiresAt: Date;
//         isVerified: boolean;
//         lastLogin: Date;
//     }) {
//         return this.prisma.user.create({
//             data: userData,
//         });
//     }

//     async findById(userId: number) {
//         // Try to get from cache first
//         console.log("Checking cache for userId:", userId);
//         const logger = new Logger(UserService.name);
//         logger.debug(`UserService initialized — cacheService=${!!this.cacheService}`);
//         const cacheKey = CacheKeyBuilder.userProfile(userId);
//         console.log(`Cache check for key: ${cacheKey}`);
//         const cachedUser = await this.cacheService.get(cacheKey);
//         console.log(`Cache check for key: ${cacheKey} - found: ${!!cachedUser}`);

//         if (cachedUser) {
//             return JSON.parse(cachedUser);
//         }

//         // If not in cache, get from database
//         const user = await this.prisma.user.findUnique({
//             where: { id: userId },
//         });

//         // Cache the result if found
//         if (user) {
//             await this.cacheService.set(
//                 cacheKey,
//                 JSON.stringify(user),
//                 3600, // 1 hour
//             );
//         }

//         return user;
//     }

//     async updateLastLogin(userId: number): Promise<void> {
//         await this.prisma.user.update({
//             where: { id: userId },
//             data: { lastLogin: new Date() },
//         });
//     }

//     async createVerificationToken(
//         userId: number,
//         token: string,
//         expiresAt: Date,
//     ) {
//         return this.prisma.userVerification.create({
//             data: {
//                 userId,
//                 token,
//                 expiresAt,
//                 isUsed: false,
//             },
//         });
//     }


// }