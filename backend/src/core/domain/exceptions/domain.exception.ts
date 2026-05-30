/**
 * Excepciones de dominio independientes del framework HTTP.
 * El ExceptionFilter las traduce a respuestas HTTP.
 */
export abstract class DomainException extends Error {
  abstract readonly code: string;
  abstract readonly httpStatus: number;

  protected constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

export class EntityNotFoundException extends DomainException {
  readonly code = 'ENTITY_NOT_FOUND';
  readonly httpStatus = 404;

  constructor(entity: string, identifier?: string | number) {
    super(
      identifier !== undefined
        ? `${entity} con identificador "${identifier}" no encontrado.`
        : `${entity} no encontrado.`,
    );
  }
}

export class BusinessRuleViolationException extends DomainException {
  readonly code = 'BUSINESS_RULE_VIOLATION';
  readonly httpStatus = 422;

  constructor(message: string) {
    super(message);
  }
}

export class ConflictException extends DomainException {
  readonly code = 'CONFLICT';
  readonly httpStatus = 409;

  constructor(message: string) {
    super(message);
  }
}

export class UnauthorizedDomainException extends DomainException {
  readonly code = 'UNAUTHORIZED';
  readonly httpStatus = 401;

  constructor(message = 'No autorizado.') {
    super(message);
  }
}

export class ForbiddenDomainException extends DomainException {
  readonly code = 'FORBIDDEN';
  readonly httpStatus = 403;

  constructor(message = 'Acceso denegado.') {
    super(message);
  }
}

export class ValidationDomainException extends DomainException {
  readonly code = 'VALIDATION_ERROR';
  readonly httpStatus = 400;

  constructor(message: string) {
    super(message);
  }
}
