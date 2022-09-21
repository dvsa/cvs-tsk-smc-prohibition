/* eslint-disable @typescript-eslint/comma-dangle */
/* eslint-disable @typescript-eslint/indent */
/* eslint-disable @typescript-eslint/quotes */
/* eslint-disable quote-props */
import { DynamoDBRecord } from 'aws-lambda';
import { extractMCTestResults } from '../../src/utils/extractTestResults';
import dynamoEventWCert from './data/dynamoEventWithCert.json';
import dynamoEventMultipleTests from './data/dynamoEventMultipleTestTypes.json';
import dynamoEventMultipleTestTypesPassAndPrs from './data/dynamoEventMultipleTestTypesPassAndPrs.json';
import dynamoEventCancelled from './data/dynamoEventCancelled.json';
import { MCRequest } from "../../src/utils/MCRequest";

describe('extractTestResults', () => {
  let DYNAMO_DATA: DynamoDBRecord;
  let MC_RESULT: MCRequest[];

  it(`GIVEN data WHEN it has a status of cancelled THEN expect no mc requests are to be generated`, () => {
    DYNAMO_DATA = dynamoEventCancelled as DynamoDBRecord;
    MC_RESULT = extractMCTestResults(DYNAMO_DATA);
    expect(MC_RESULT).toHaveLength(0);
  });
  it(`GIVEN data with two test types WHEN test results are extracted into events THEN expect two mc requests are to be generated`, () => {
    DYNAMO_DATA = dynamoEventMultipleTests as DynamoDBRecord;
    MC_RESULT = extractMCTestResults(DYNAMO_DATA);
    expect(MC_RESULT).toHaveLength(2);
  });
  it(`GIVEN data with two test types WHEN test results are extracted into events THEN expect one mc requests are to be generated`, () => {
    DYNAMO_DATA = dynamoEventMultipleTestTypesPassAndPrs as DynamoDBRecord;
    MC_RESULT = extractMCTestResults(DYNAMO_DATA);
    expect(MC_RESULT).toHaveLength(1);
  });
  it(`aGIVEN data with two test types WHEN test results are extracted into events THEN expect one mc requests are to be generated`, () => {
    DYNAMO_DATA = dynamoEventWCert as DynamoDBRecord;
    MC_RESULT = extractMCTestResults(DYNAMO_DATA);
    expect(MC_RESULT).toHaveLength(1);
  });
  it(`GIVEN null WHEN test results are extracted into events THEN produce error`, () => {
    MC_RESULT = extractMCTestResults(null);
    expect(MC_RESULT).toBeNull();
  });
});
