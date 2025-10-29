import { Module, forwardRef } from "@nestjs/common";
import { UserController } from "./user.controller";
import { PrismaService } from "../../core/prisma/prisma.service";
import { UserService } from "./user.service";
import { CacheService } from "../../core/cache/cache.service";
import { CacheModule } from "src/core/cache/cache.module";

@Module({
    imports: [],
    controllers: [UserController],
    providers: [PrismaService, UserService],
    exports: [UserService],
})

export class UserModule { }