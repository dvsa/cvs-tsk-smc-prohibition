/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

/**
 * Defines a throwable subclass of Error used for signaling an HTTP status code.
 */
export class HTTPError extends Error {
  public statusCode: number;

  public body: any;

  /**
   * Constructor for the HTTPResponseError class
   * @param statusCode the HTTP status code
   * @param body - the response body
   */
  constructor(statusCode: number, body: any) {
    super();
    this.statusCode = statusCode;
    this.body = body;

    console.log(`HTTP STATUS CODE RETURNED: ${this.statusCode}`);
  }
}
