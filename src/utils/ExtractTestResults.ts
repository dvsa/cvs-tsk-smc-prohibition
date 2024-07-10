/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { unmarshall } from '@aws-sdk/util-dynamodb';
import { DateTime } from 'luxon';
import { DynamoDBRecord } from 'aws-lambda';
import { TestResultSchema } from '@dvsa/cvs-type-definitions/types/v1/test-result';
import { TestResults } from '@dvsa/cvs-type-definitions/types/v1/enums/testResult.enum'
import { TestStatus } from '@dvsa/cvs-type-definitions/types/v1/enums/testStatus.enum'
import { TestTypeSchema } from '@dvsa/cvs-type-definitions/types/v1/test-type';
import { PROHIB_CLEARANCE_TEST_TYPE_IDS } from '../assets/Enums';
import logger from '../observability/Logger';
import { HTTPError } from './HTTPError';
import { MCRequest } from './MCRequest';
import { ValidationUtil } from './ValidationUtil';

/**
 * This is used to extract the relevant fields from the test record that is
 * required to be sent to MC in order to  clear prohibitions
 * @param record
 */
export const extractMCTestResults = (record: DynamoDBRecord): MCRequest[] => {
  const testResultUnmarshall : TestResultSchema = unmarshall(record.dynamodb.NewImage as any) as TestResultSchema;
  logger.info(
    `Processing testResultId: ${JSON.stringify(
      testResultUnmarshall.testResultId,
    )}`,
  );
  const mcRequest: MCRequest[] = testResultUnmarshall.testTypes
    .filter((testType) =>
      PROHIB_CLEARANCE_TEST_TYPE_IDS.IDS.includes(testType.testTypeId),
    )
    .filter(
      (testType) =>
        testType.testResult === TestResults.PASS || testType.testResult === TestResults.PRS,
    )
    .filter(
      () =>
        testResultUnmarshall.vehicleType === 'hgv' ||
        testResultUnmarshall.vehicleType === 'psv' ||
        testResultUnmarshall.vehicleType === 'trl',
    )
    .filter(() => testResultUnmarshall.testStatus === TestStatus.SUBMITTED)
    .map((testType : TestTypeSchema ) : MCRequest => ({
      vehicleIdentifier:
        testResultUnmarshall.vehicleType === 'trl'
          ? testResultUnmarshall.trailerId
          : testResultUnmarshall.vrm,
      testDate: isoDateFormatter(testType.testTypeEndTimestamp),
      vin: testResultUnmarshall.vin,
      testResult: calculateTestResult(testType.testResult as TestResults),
      hgvPsvTrailFlag: testResultUnmarshall.vehicleType.charAt(0).toUpperCase(),
      testResultId: testResultUnmarshall.testResultId,
    }));
  const validationErrors = ValidationUtil.validateMcRequest(mcRequest);
  if (validationErrors && validationErrors.length) {
    throw new HTTPError(400, {
      errors: validationErrors,
    });
  }

  logger.info(`Successfully processed: ${JSON.stringify(mcRequest)}`);
  return mcRequest;
};

/**
 * This method is used to change the test result to be a single, uppercase character
 * @param testResult
 */
export const calculateTestResult = (testResult: TestResults): string =>
  testResult === TestResults.PASS ? 'S' : 'R';

/**
 * This method is used to change the format of an iso string to be formatted as yyyy/MM/dd
 * @param date
 */
export const isoDateFormatter = (date: string): string =>
  DateTime.fromISO(date).toFormat('dd/MM/yyyy');
