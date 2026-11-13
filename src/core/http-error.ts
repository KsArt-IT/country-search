export class HttpError extends Error {
  status: number;

  constructor(_status: number, message?: string) {
    // TODO: implement (TDD stub)
    super(message);
    this.status = 0;
  }
}
