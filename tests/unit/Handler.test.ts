/* eslint-disable import/first */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable import/no-unresolved */
import { SQSEvent } from 'aws-lambda';
import { sendMCProhibition } from '../../src/eventbridge/Send';
import { SendResponse } from '../../src/eventbridge/SendResponse';
import { extractMCTestResults } from '../../src/utils/ExtractTestResults';
import dynamoRecordFiltered from './data/dynamoEventWithCert.json';
import { MCRequest } from '../../src/utils/MCRequest';
import { handler } from '../../src/handler';

jest.mock('../../src/eventbridge/Send');
jest.mock('../../src/utils/ExtractTestResults');

describe('Application entry', () => {
  const event: SQSEvent = {
    Records: [
      {
        'messageId': '1317d15-a23b2-4c68-a2da-67cc685dda5b',
        'receiptHandle': 'aer3fiu34yufybuy34f334',
        'body': JSON.stringify(dynamoRecordFiltered),
        'attributes': {
          'ApproximateReceiveCount': '1',
          'SentTimestamp': '1717678383236',
          'SenderId': 'AIDAISMY7JYY5F7RTT6AO',
          'ApproximateFirstReceiveTimestamp': '1717678383247',
        },
        'messageAttributes': {},
        'md5OfBody': '45bd1375e48194d7e1563cf20462d',
        'eventSource': 'aws:sqs',
        'eventSourceARN': 'arn:aws:sqs:eu-west-1:local:cvs-smc-prohibition-local-queue',
        'awsRegion': 'eu-west-1',
      },
    ],
  };
  const sendResponse: SendResponse = {
    SuccessCount: 1,
    FailCount: 0,
  };

  jest.mocked(extractMCTestResults).mockReturnValue(Array<MCRequest>());
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Handler', () => {
    it('When there is an event that gets processed successfully no errors are produced', async () => {

      jest.mocked(sendMCProhibition).mockResolvedValue(sendResponse);
      await handler(event, null, (error: string | Error, result: string) => {
        expect(result).toBe('Data processed successfully.');
        expect(error).toBeNull();
        expect(sendMCProhibition).toHaveBeenCalledTimes(1);
      });
    });

    it('When there is an event that gets processed successfully in proper case then no errors are produced', async () => {
      process.env.SEND_TO_SMC = 'True';
      jest.mocked(sendMCProhibition).mockResolvedValue(sendResponse);
      await handler(event, null, (error: string | Error, result: string) => {
        expect(result).toBe('Data processed successfully.');
        expect(error).toBeNull();
        expect(sendMCProhibition).toHaveBeenCalledTimes(1);
      });
    });

    it('When there is an error when sending the object and error is produced', async () => {
      process.env.SEND_TO_SMC = 'True';
      jest.mocked(sendMCProhibition).mockRejectedValue(new Error('Oh no!'));
      await handler(event, null, (error: string | Error, result: string) => {
        expect(error).toBeNull();
        expect(result).toBe('Data processed unsuccessfully: Error: Oh no!');
        expect(sendMCProhibition).toHaveBeenCalledTimes(1);
      });
    });

    it('When there is an invalid environment variable a log is produced', async () => {
      process.env.SEND_TO_SMC = 'false';
      jest.spyOn(console, 'log');
      await handler(event, null, (error: string | Error, result: string) => {
        expect(error).toBeNull();
        expect(result).toBe('Function not triggered, Missing or not true environment variable present');
      });
    });
  });
});
