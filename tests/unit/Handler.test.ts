import { SQSEvent } from 'aws-lambda';
import { sendMCProhibition } from '../../src/eventbridge/Send';
import { SendResponse } from '../../src/eventbridge/SendResponse';
import { extractMCTestResults } from '../../src/utils/ExtractTestResults';
import dynamoRecordFiltered from './data/dynamoEventWithCert.json';
import { MCRequest } from '../../src/utils/MCRequest';
import { handler } from '../../src/handler';
import logger from '../../src/observability/Logger';

jest.mock('../../src/eventbridge/Send');
jest.mock('../../src/utils/ExtractTestResults');

describe('Application entry', () => {
  const errorLogSpy = jest.spyOn(logger, "error");
  const infoLogSpy = jest.spyOn(logger, "info");
  const event: SQSEvent = {
    Records: [
      {
        messageId: '1317d15-a23b2-4c68-a2da-67cc685dda5b',
        receiptHandle: 'aer3fiu34yufybuy34f334',
        body: JSON.stringify({
          Message: {
            eventID: '...',
            eventName: 'INSERT',
            dynamodb: {
              NewImage: dynamoRecordFiltered.dynamodb.NewImage,
            },
          },
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
    errorLogSpy.mockClear();
    infoLogSpy.mockClear();
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
        // add check to see if logs spits out what was there before
        expect(result).toEqual({"batchItemFailures": []});
        expect(sendMCProhibition).toHaveBeenCalledWith(expectedMCRequests);
      });
    });

    it('should handle an error when sending the object', async () => {
      process.env.SEND_TO_SMC = 'True';
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
      const expectedResponse = {
        "batchItemFailures": [
          {
            "itemIdentifier": "1317d15-a23b2-4c68-a2da-67cc685dda5b",
          },
        ]
      };

      jest.mocked(extractMCTestResults).mockReturnValue(expectedMCRequests);
      jest.mocked(sendMCProhibition).mockRejectedValue(new Error('Oh no!'));

      await handler(event, null, (error, result) => {
        expect(error).toBeNull();
        expect(errorLogSpy).toHaveBeenCalledWith(`Error processing record: ${JSON.stringify(event.Records[0])}`);
        expect(result).toEqual(expectedResponse);
        expect(sendMCProhibition).toHaveBeenCalledTimes(1);
      });
    });

    it('should log and not call sendMCProhibition if mcRequests is empty after extracting test results', async () => {
      process.env.SEND_TO_SMC = 'True';
      const expectedMCRequests: MCRequest[] = [];
      const expectedResponse = {"batchItemFailures": []};

      jest.mocked(extractMCTestResults).mockReturnValue(expectedMCRequests);

      await handler(event, null, (error, result) => {
        expect(error).toBeNull();
        expect(infoLogSpy).toHaveBeenCalledWith(`No relevant MC test results found in the record: ${event.Records[0].body}`);
        expect(result).toEqual(expectedResponse);
        expect(sendMCProhibition).toHaveBeenCalledTimes(0);
      });
    });

    it('should handle a false environment variable', async () => {
      process.env.SEND_TO_SMC = 'false';

      await handler(event, null, (error, result) => {
        expect(error).toBeNull();
        expect(infoLogSpy).toHaveBeenCalledWith('Function not triggered, Missing or not true environment variable present');
        expect(result).toEqual({"batchItemFailures": []});
        expect(extractMCTestResults).not.toHaveBeenCalled();
        expect(sendMCProhibition).not.toHaveBeenCalled();
      });
    });

    it('should handle a missing environment variable', async () => {
      delete process.env.SEND_TO_SMC;

      await handler(event, null, (error, result) => {
        expect(error).toBeNull();
        expect(infoLogSpy).toHaveBeenCalledWith('Function not triggered, Missing or not true environment variable present');
        expect(result).toEqual({"batchItemFailures": []});
        expect(extractMCTestResults).not.toHaveBeenCalled();
        expect(sendMCProhibition).not.toHaveBeenCalled();
      });
    });

    it('should handle an error that does not have message', async () => {
      process.env.SEND_TO_SMC = 'TRUE';

      const eventWithError: SQSEvent = { ...event };
      eventWithError.Records[0].body = 'invalid JSON to cause error';

      jest.spyOn(JSON, 'parse').mockImplementationOnce(() => {
        const error = new Error('CustomError with no message');
        delete error.message;
        throw error;
      });

      const expectedResponse = {
        batchItemFailures: [
          { itemIdentifier: eventWithError.Records[0].messageId },
        ],
      };

      const expectedLog = JSON.stringify(eventWithError.Records[0]);

      await handler(eventWithError, null, (error, result) => {
        expect(error).toBeNull();
        expect(result).toEqual(expectedResponse);
        expect(infoLogSpy).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(`Error processing record: ${expectedLog}`);
        expect(logger.error).toHaveBeenCalledWith(expect.any(SyntaxError));
      });
    });

    it('should add only 1 record to batchItemFailures if one of two records fails', async () => {
      process.env.SEND_TO_SMC = 'TRUE';

      const eventWithTwoRecords:SQSEvent = { ...event};
      eventWithTwoRecords.Records.push(event.Records[0]);
      eventWithTwoRecords.Records[1].messageId = '1317d15-a23b2-4c68-a2da-67c999999999';

      const expectedMCRequests: MCRequest[] = [
        {
          vehicleIdentifier: 'ABC1234',
          testDate: '14/01/2019',
          vin: 'XMGDE02FS0H012303',
          testResult: 'P',
          hgvPsvTrailFlag: 'T',
          testResultId: 'some-test-result-id' },
      ];

      jest.mocked(extractMCTestResults).mockReturnValueOnce(expectedMCRequests).mockReturnValueOnce(expectedMCRequests);
      jest.mocked(sendMCProhibition).mockResolvedValueOnce({ SuccessCount: 1, FailCount: 0 }).mockRejectedValueOnce(new Error('Oh no!'));

      const expectedResponse = {
        batchItemFailures: [
          { itemIdentifier: '1317d15-a23b2-4c68-a2da-67c999999999' },
        ],
      };

      await handler(eventWithTwoRecords, null, (error, result) => {
        expect(error).toBeNull();
        expect(result).toEqual(expectedResponse);
        expect(sendMCProhibition).toHaveBeenCalledTimes(2);
        expect(sendMCProhibition).toHaveBeenCalledWith(expectedMCRequests);
      });
    });

    it('should log and move on if eventName is REMOVE', async () => {
      process.env.SEND_TO_SMC = 'TRUE';

      const eventNameWithRemove:SQSEvent = { ...event };
      eventNameWithRemove.Records[0].body = JSON.stringify({
        eventID: '...',
        eventName: 'REMOVE',
        dynamodb: {
          NewImage: dynamoRecordFiltered.dynamodb.NewImage,
        },
      });

      const expectedResponse = {
        batchItemFailures: [],
      };

      const expectedLog = JSON.stringify(JSON.parse(eventNameWithRemove.Records[0].body));

      await handler(eventNameWithRemove, null, (error, result) => {
        expect(error).toBeNull();
        expect(result).toEqual(expectedResponse);
        expect(sendMCProhibition).not.toHaveBeenCalled();
        expect(infoLogSpy).toHaveBeenCalledWith(`Record has REMOVE event name, skipping record: ${expectedLog}`);
      });
    });
  });
});


