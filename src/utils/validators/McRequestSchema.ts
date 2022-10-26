import Joi from 'joi';


// ignore for now
export const mcRequestSchema = Joi.array().items({
  vehicleIdentifier: Joi.string().required(),
  testDate: Joi.string().required(),
  vin: Joi.string().required(),
  testResult: Joi.string().required(),
  hgvPsvTrailFlag: Joi.string().required(),
  testResultId: Joi.string().required(),
});
