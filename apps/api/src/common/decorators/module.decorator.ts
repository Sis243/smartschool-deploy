import { SetMetadata } from '@nestjs/common';
import { ModuleCle } from '../constants/modules';

export const MODULE_KEY = 'module';
// Marque un contrôleur/route comme appartenant à un module désactivable par
// école — voir ModuleActifGuard, qui bloque l'accès si l'école ne l'a pas
// activé (super-admin toujours autorisé).
export const RequireModule = (module: ModuleCle) => SetMetadata(MODULE_KEY, module);
