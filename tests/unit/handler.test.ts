/* eslint-disable import/first */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/ban-ts-comment */

process.env.LOG_LEVEL = 'debug';
import { mocked } from 'ts-jest/utils';
import { DynamoDBRecord, DynamoDBStreamEvent } from 'aws-lambda';
import { sendMCProhibition } from '../../src/eventbridge/send';
import { SendResponse } from '../../src/eventbridge/SendResponse';
import {
  extractMCTestResults,
} from '../../src/utils/extractTestResults';
import dynamoRecordFiltered from './data/dynamoEventWithCert.json';
import dynamoRecordNonFiltered from './data/dynamoEventWithoutCert.json';
import { MCRequest } from '../../src/utils/MCRequest';
import { handler } from '../../src/handler';

jest.mock('../../src/eventbridge/send');
jest.mock('../../src/utils/extractTestResults');

describe('Application entry', () => {
  let event: DynamoDBStreamEvent;
  mocked(extractMCTestResults).mockReturnValue(Array<MCRequest>());
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Handler', () => {
    it('GIVEN event with filtered PNumber WHEN events are processed succesfully THEN a callback result is returned.', async () => {
      event = {
        Records: [dynamoRecordFiltered as DynamoDBRecord],
      };
      const mSendResponse: SendResponse = {
        SuccessCount: 1,
        FailCount: 0,
      };
      mocked(sendMCProhibition).mockResolvedValue(mSendResponse);
      await handler(event, null, (error: string | Error, result: string) => {
        expect(result).toEqual('Data processed successfully.');
        expect(error).toBeNull();
        expect(sendMCProhibition).toBeCalledTimes(1);
      });
    });
    it('GIVEN event with filtered PNumber WHEN events are processed unsuccessfully THEN a callback error is returned.', async () => {
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
    it('GIVEN event with non filtered PNumber WHEN events are processed THEN log outputted.', async () => {
      event = {
        Records: [dynamoRecordNonFiltered as DynamoDBRecord],
      };
      // @ts-ignore
      const consoleSpy = jest.spyOn(console._stdout, 'write');
      await handler(event, null, (error: string | Error, result: string) => {
        expect(error).toBeNull();
        expect(result).toEqual('Data processed successfully.');
        expect(consoleSpy).toBeCalledTimes(3);
      });
    });
  });
});
