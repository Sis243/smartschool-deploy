import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class ParentJwtGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    if (err || !user) throw err || new UnauthorizedException();
    if (user.type !== 'parent') throw new UnauthorizedException('Accès réservé aux parents');
    return user;
  }
}
