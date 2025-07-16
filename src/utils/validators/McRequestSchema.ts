/* eslint-disable */

import Joi from 'joi';

export const mcRequestSchema = Joi.array().items(
  Joi.object({
    vehicleIdentifier: Joi.string().required().max(8).messages({
      'any.required': '"vehicleIdentifier" is required',
      'string.max': '"vehicleIdentifier" must be at most 8 characters long'
    }),
    testDate: Joi.string().required().messages({
      'any.required': '"testDate" is required'
    }),
    vin: Joi.string().required().messages({
      'any.required': '"vin" is required'
    }),
    testResult: Joi.string().required().messages({
      'any.required': '"testResult" is required'
    }),
    hgvPsvTrailFlag: Joi.string().required().messages({
      'any.required': '"hgvPsvTrailFlag" is required'
    }),
    testResultId: Joi.string().required().messages({
      'any.required': '"testResultId" is required'
    }),
  }));
