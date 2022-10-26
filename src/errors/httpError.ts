import { HttpErrorBody } from '../types/httpErrorBody.interface';

/**
 * Defines a throwable subclass of Error used for signaling an HTTP status code.
 */
export class HttpError extends Error {
  public statusCode: number;

  public body: HttpErrorBody;

  /**
   * Constructor for the HTTPResponseError class
   * @param statusCode the HTTP status code
   * @param body - the response body
   */
  constructor( statusCode: number, body: HttpErrorBody) {
    super();
    this.statusCode = statusCode;
    this.body = body;

    console.log(`HTTP STATUS CODE RETURNED: ${this.statusCode}`);
  }
}
