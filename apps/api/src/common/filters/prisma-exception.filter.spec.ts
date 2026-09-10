import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

// Ce filtre est le principal filet de sécurité contre les données non
// validées (voir modules.ts / la plupart des `data: any`) : une erreur
// Prisma mal mappée redevient un 500 générique, ce que ce test empêche.
describe('PrismaExceptionFilter', () => {
  const filter = new PrismaExceptionFilter();

  function buildHost() {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status };
    const request = { method: 'POST', url: '/api/v1/transport/bus' };
    const host: any = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    };
    return { host, status, json };
  }

  it('mappe P2002 (contrainte unique) en 409 avec les champs en conflit', () => {
    const { host, status, json } = buildHost();
    const exception = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '5.13.0',
      meta: { target: ['tenantId', 'matricule'] },
    });

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 409,
        message: expect.stringContaining('tenantId, matricule'),
      }),
    );
  });

  it('mappe P2025 (introuvable) en 404', () => {
    const { host, status, json } = buildHost();
    const exception = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '5.13.0',
    });

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('mappe P2003 (référence invalide) en 400', () => {
    const { host, status, json } = buildHost();
    const exception = new Prisma.PrismaClientKnownRequestError('Foreign key constraint failed', {
      code: 'P2003',
      clientVersion: '5.13.0',
    });

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('Référence invalide') }),
    );
  });

  it('mappe un code Prisma inconnu en 400 générique (jamais un 500)', () => {
    const { host, status } = buildHost();
    const exception = new Prisma.PrismaClientKnownRequestError('Something else', {
      code: 'P9999',
      clientVersion: '5.13.0',
    });

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(400);
  });

  it('mappe une erreur de validation (champ/type incorrect) en 400', () => {
    const { host, status, json } = buildHost();
    const exception = new Prisma.PrismaClientValidationError('Unknown argument `capacite`', {
      clientVersion: '5.13.0',
    });

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining('format inattendu') }),
    );
  });
});
