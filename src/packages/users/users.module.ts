import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { PrismaService } from "../../core/prisma/prisma.service";
import { UsersService } from "./users.service";

@Module({
    controllers: [UsersController],
    providers: [PrismaService, UsersService]
})
export class UsersModule { }