import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();

    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return true; // guest
    }

    try {
      const result = await super.canActivate(context);
      return result as boolean;
    } catch (err) {
      // ❗ token sai → vẫn cho vào như guest
      return true;
    }
  }
}
