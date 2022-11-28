/* eslint-disable */

import { MCRequest } from './MCRequest';
import { mcRequestSchema } from './validators/McRequestSchema';

export class ValidationUtil {
  public static validateMcRequest(mcRequest: MCRequest[]): any {
    const validation = mcRequestSchema.validate(mcRequest);

    if (validation.error) {
      return validation.error.details.map((detail: { message: string }) => detail.message);
    }
    return validation;
  }
}
