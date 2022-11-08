/* eslint-disable */

import { DynamoDBRecord } from 'aws-lambda';
import { extractMCTestResults } from '../../src/utils/ExtractTestResults';
import dynamoEventWCert from './data/dynamoEventWithCert.json';
import dynamoEventMultipleTests from './data/dynamoEventMultipleTestTypes.json';
import dynamoEventMultipleTestTypesPassAndPrs from './data/dynamoEventMultipleTestTypesPassAndPrs.json';
import dynamoEventCancelled from './data/dynamoEventCancelled.json';
import { MCRequest } from '../../src/utils/MCRequest';

describe('extractTestResults', () => {
  let DYNAMO_DATA: DynamoDBRecord;
  let MC_RESULT: MCRequest[];

  it('when a test result has a status of cancelled then expect no mc requests are to be created', () => {
    DYNAMO_DATA = dynamoEventCancelled as DynamoDBRecord;
    MC_RESULT = extractMCTestResults(DYNAMO_DATA);
    expect(MC_RESULT).toHaveLength(0);
  });
  it('when there is a test result with two test types then expect two mc requests are to be created', () => {
    DYNAMO_DATA = dynamoEventMultipleTests as DynamoDBRecord;
    MC_RESULT = extractMCTestResults(DYNAMO_DATA);
    expect(MC_RESULT).toHaveLength(2);
  });
  it('when there is a test result with two test types then expect one mc request to be created', () => {
    DYNAMO_DATA = dynamoEventMultipleTestTypesPassAndPrs as DynamoDBRecord;
    MC_RESULT = extractMCTestResults(DYNAMO_DATA);
    expect(MC_RESULT).toHaveLength(1);
  });
  it('when there is a test result with two test types expect one mc requests are to be generated', () => {
    DYNAMO_DATA = dynamoEventWCert as DynamoDBRecord;
    MC_RESULT = extractMCTestResults(DYNAMO_DATA);
    expect(MC_RESULT).toHaveLength(1);
  });
  it('when processing a test result when there is a field missing a validation error is returned', () => {
    DYNAMO_DATA = dynamoEventWCert as DynamoDBRecord;
    DYNAMO_DATA.dynamodb.NewImage.vin = null;

    try {
      extractMCTestResults(DYNAMO_DATA);
    } catch (e) {
      expect(e.body.errors[0]).toEqual('"vin" is required');
    }
  });
});
