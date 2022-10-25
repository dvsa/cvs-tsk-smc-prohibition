/* eslint-disable */

//TODO fix eslint
import { MCRequest } from './MCRequest';
import { mcRequestSchema } from './validators/McRequestSchema';

export class ValidationUtil {
  public static validateMcRequest(mcRequest: MCRequest[]) {
    const validation = mcRequestSchema.validate(mcRequest);

    if (validation.error) {
      return validation.error.details.map((detail: { message: string }) => detail.message);
    }
    return validation;
  }
}
