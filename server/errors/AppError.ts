/**
 * Erreur métier « attendue » : elle porte le code HTTP à renvoyer.
 *
 * Les services lèvent des AppError (ex. « crédits insuffisants » → 400) ;
 * le middleware errorHandler les transforme en réponse JSON propre.
 * Toute autre erreur est considérée comme imprévue → 500, sans détail
 * technique renvoyé au client (on ne divulgue pas la pile d'appels).
 */
export class AppError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "AppError";
  }

  static badRequest(message: string) { return new AppError(400, message); }
  static unauthorized(message = "Authentification requise") { return new AppError(401, message); }
  static forbidden(message = "Accès refusé") { return new AppError(403, message); }
  static notFound(message = "Ressource introuvable") { return new AppError(404, message); }
  static conflict(message: string) { return new AppError(409, message); }
  static unavailable(message: string) { return new AppError(503, message); }
}
