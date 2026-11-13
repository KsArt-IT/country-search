export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string = `HTTP ${status}`) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}
