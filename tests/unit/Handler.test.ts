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
        messageId: '1317d15-a23b2-4c68-a2da-67cc685dda5b',
        receiptHandle: 'aer3fiu34yufybuy34f334',
        body: JSON.stringify({
          Type: 'Notification',
          MessageId: 'some-message-id',
          TopicArn: 'arn:aws:sns:us-east-1:123456789012:my-topic',
          Subject: 'Test Subject',
          Message: JSON.stringify({
            eventID: '...',
            eventName: 'INSERT',
            dynamodb: {
              NewImage: dynamoRecordFiltered.dynamodb.NewImage,
            },
          }),
        }),
        attributes: {
          ApproximateReceiveCount: '1',
          SentTimestamp: '1717678383236',
          SenderId: 'AIDAISMY7JYY5F7RTT6AO',
          ApproximateFirstReceiveTimestamp: '1717678383247',
        },
        messageAttributes: {},
        md5OfBody: '45bd1375e48194d7e1563cf20462d',
        eventSource: 'aws:sqs',
        eventSourceARN: 'arn:aws:sqs:eu-west-1:local:cvs-smc-prohibition-local-queue',
        awsRegion: 'eu-west-1',
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
    process.env.SEND_TO_SMC = 'True';
    it('should process a valid event successfully', async () => {
      const expectedMCRequests: MCRequest[] = [
        {
          vehicleIdentifier: 'ABC1234',
          testDate: '14/01/2019',
          vin: 'XMGDE02FS0H012303',
          testResult: 'P',
          hgvPsvTrailFlag: 'T',
          testResultId: 'some-test-result-id',
        },
      ];

      jest.mocked(extractMCTestResults).mockReturnValue(expectedMCRequests);
      jest.mocked(sendMCProhibition).mockResolvedValue(sendResponse);

      await handler(event, null, (error, result) => {
        expect(error).toBeNull();
        expect(result).toBe('Data processed successfully.');
        expect(sendMCProhibition).toHaveBeenCalledWith(expectedMCRequests);
      });
    });

    it('should handle an error when sending the object', async () => {
      process.env.SEND_TO_SMC = 'True';
      const expectedErrorMessage = 'Data processed unsuccessfully: Error: Oh no!';
      jest.mocked(sendMCProhibition).mockRejectedValue(new Error('Oh no!'));

      await handler(event, null, (error, result) => {
        expect(error).toBeNull();
        expect(result).toBe(expectedErrorMessage);
        expect(sendMCProhibition).toHaveBeenCalledTimes(1);
      });
    });

    it('should handle an invalid environment variable', async () => {
      process.env.SEND_TO_SMC = 'false';

      await handler(event, null, (error, result) => {
        expect(error).toBeNull();
        expect(result).toBe('Function not triggered, Missing or not true environment variable present');
        expect(extractMCTestResults).not.toHaveBeenCalled();
        expect(sendMCProhibition).not.toHaveBeenCalled();
      });
    });
  });
});


