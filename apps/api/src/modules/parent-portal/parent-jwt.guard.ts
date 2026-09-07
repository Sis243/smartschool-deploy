import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { verifierAbonnementActif } from '../../common/utils/verifier-abonnement';

@Injectable()
export class ParentJwtGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    if (err || !user) throw err || new UnauthorizedException();
    if (user.type !== 'parent') throw new UnauthorizedException('Accès réservé aux parents');
    verifierAbonnementActif(user.tenant);
    return user;
  }
}
