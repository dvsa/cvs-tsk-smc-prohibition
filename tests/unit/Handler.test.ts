/* eslint-disable import/first */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import { mocked } from 'ts-jest/utils';
import { DynamoDBRecord, DynamoDBStreamEvent } from 'aws-lambda';
import { sendMCProhibition } from '../../src/eventbridge/Send';
import { SendResponse } from '../../src/eventbridge/SendResponse';
import { extractMCTestResults } from '../../src/utils/ExtractTestResults';
import dynamoRecordFiltered from './data/dynamoEventWithCert.json';
import { MCRequest } from '../../src/utils/MCRequest';
import { handler } from '../../src/handler';

jest.mock('../../src/eventbridge/Send');
jest.mock('../../src/utils/ExtractTestResults');

describe('Application entry', () => {
  let event: DynamoDBStreamEvent;
  mocked(extractMCTestResults).mockReturnValue(Array<MCRequest>());
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Handler', () => {
    it('When there is an event that gets processed successfully no errors are produced', async () => {
      event = {
        Records: [dynamoRecordFiltered as DynamoDBRecord],
      };
      const sendResponse: SendResponse = {
        SuccessCount: 1,
        FailCount: 0,
      };
      mocked(sendMCProhibition).mockResolvedValue(sendResponse);
      await handler(event, null, (error: string | Error, result: string) => {
        expect(result).toEqual('Data processed successfully.');
        expect(error).toBeNull();
        expect(sendMCProhibition).toBeCalledTimes(1);
      });
    });
    it('When there is an error when sending the object and error is produced', async () => {
      event = {
        Records: [dynamoRecordFiltered as DynamoDBRecord],
      };
      mocked(sendMCProhibition).mockRejectedValue(new Error('Oh no!'));
      await handler(event, null, (error: string | Error, result: string) => {
        expect(error).toEqual(new Error('Data processed unsuccessfully.'));
        expect(result).toBeUndefined();
        expect(sendMCProhibition).toBeCalledTimes(1);
      });
    });
  });
});
