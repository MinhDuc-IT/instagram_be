import { ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../../decorators/response.decorator';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    private readonly logger = new Logger(JwtAuthGuard.name);

    constructor(private reflector: Reflector) {
        super();
    }

    canActivate(context: ExecutionContext) {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        // Add your custom authentication logic here
        // for example, call super.logIn(request) to establish a session.
        return super.canActivate(context);
    }

    handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
        // Enhanced error handling with detailed logging
        if (err || !user) {
            const request = context.switchToHttp().getRequest();
            const errorDetails = {
                path: request.path,
                method: request.method,
                error: err?.message || info?.message || 'Unauthorized access',
                timestamp: new Date().toISOString(),
            };

            this.logger.warn(
                `Authentication failed: ${JSON.stringify(errorDetails)}`,
            );
            throw new UnauthorizedException('Authentication required');
        }

        return user;
    }
}
