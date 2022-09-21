/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { DynamoDBRecord } from 'aws-lambda';
import { DynamoDB } from 'aws-sdk';
import { DateTime } from 'luxon';
import { TestActivity } from './testActivity';
import { MCRequest } from './MCRequest';
import logger from '../observability/logger';

/**
 * This is used to extract the relevant fields from the test record that is
 * required to be sent to MC in order to  clear prohibitions
 * @param record
 */
export const extractMCTestResults = (record: DynamoDBRecord): MCRequest[] => {
  try {
    const data = DynamoDB.Converter.unmarshall(record.dynamodb.NewImage);
    logger.info(`Starting MC processing for ${JSON.stringify(data.vehicleId)}`);
    const mcRequest: MCRequest[] = data.testTypes
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      .filter((x) => x.testTypeName.toLowerCase().includes('prohibition clearance'))
      .filter((x) => (x.testResult === ('pass') || x.testResult === ('prs')))
      .filter(() => (data.vehicleType === 'hgv') || data.vehicleType === 'psv' || data.vehicleType === 'trl')
      .filter(() => data.testStatus === 'submitted')
      .map((x) => ({
        vehicleIdentifier: data.vrm,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        testDate: isoDateFormatter(x.testTypeEndTimestamp),
        vin: data.vin,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        testResult: calculateTestResult(x),
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        hgvPsvTrailFlag: calculateTrailFlag(data.vehicleType),
      }));
    logger.info(`Successfully processed for: ${JSON.stringify(mcRequest)}`);
    return mcRequest;
  } catch (e) {
    logger.error('Unsuccessfully processed');
    logger.error(e);
    return null;
  }
};

/**
 * This method is used to convert the trail flag into a single uppercase character
 * @param vehicleType
 */
// eslint-disable-next-line consistent-return
export const calculateTrailFlag = (vehicleType: string): string => {
  if (vehicleType.toLowerCase() === 'hgv') {
    return 'H';
  }
  if (vehicleType.toLowerCase() === 'psv') {
    return 'P';
  }
  if (vehicleType.toLowerCase() === 'trl') {
    return 'T';
  }
};

/**
 * This method is used to change the test result to be a single, uppercase character
 * @param testActivity
 */
export const calculateTestResult = (testActivity: TestActivity): string => (testActivity.testResult.toLowerCase() === 'pass' ? 'S' : 'R');

/**
 * This method is used to change the format of an iso string to be formatted as yyyy/MM/dd
 * @param date
 */
export const isoDateFormatter = (date: string): string => DateTime.fromISO(date).toFormat('dd/MM/yyyy');
