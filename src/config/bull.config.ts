// import Redis from 'ioredis';
// import { BullModuleOptions } from '@nestjs/bull';
// import { ConfigService } from '@nestjs/config';

// export const getBullConfig = (configService: ConfigService): BullModuleOptions => {
//     const redisUrl = configService.get<string>('REDIS_URL', 'redis://localhost:6379');

//     return {
//         createClient: () => {
//             return new Redis(redisUrl);
//         },
//         defaultJobOptions: {
//             attempts: 3,
//             backoff: {
//                 type: 'exponential',
//                 delay: 2000,
//             },
//             removeOnComplete: 100,
//             removeOnFail: 50,
//         },
//     };
// };

import Redis, { RedisOptions } from 'ioredis';
import { BullModuleOptions } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';

export const getBullConfig = (configService: ConfigService): BullModuleOptions => {
    const redisUrl = configService.get<string>('REDIS_URL', 'redis://localhost:6379');

    const redisOptions: RedisOptions = {
        enableReadyCheck: false, // ✅ fix lỗi Bull
        maxRetriesPerRequest: null, // ✅ fix lỗi Bull
    };

    return {
        createClient: (type?: 'client' | 'subscriber' | 'bclient') => {
            switch (type) {
                case 'client':
                    return new Redis(redisUrl, redisOptions);
                case 'subscriber':
                    return new Redis(redisUrl, redisOptions);
                default:
                    return new Redis(redisUrl, redisOptions);
            }
        },
        defaultJobOptions: {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 2000,
            },
            removeOnComplete: 100,
            removeOnFail: 50,
        },
    };
};
