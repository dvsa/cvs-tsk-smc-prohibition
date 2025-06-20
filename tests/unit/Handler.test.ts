/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { sendMCProhibition } from '../../src/eventbridge/Send';
import { SendResponse } from '../../src/eventbridge/SendResponse';
import { extractMCTestResults } from '../../src/utils/ExtractTestResults';
import dynamoRecordFiltered from './data/dynamoEventWithCert.json';
import { MCRequest } from '../../src/utils/MCRequest';
import { handler } from '../../src/handler';
import logger from '../../src/observability/Logger';
import { EventLogging } from '../../src/utils/EventLogging';

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

      const result = await handler(event, null, null);
      expect(result).toEqual({"batchItemFailures": []});
      expect(sendMCProhibition).toHaveBeenCalledTimes(1);
      expect(sendMCProhibition).toHaveBeenCalledWith(expectedMCRequests);
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

      const result = await handler(event, null, null);
      expect(result).toEqual(expectedResponse);
      expect(sendMCProhibition).toHaveBeenCalledTimes(1);
      expect(sendMCProhibition).toHaveBeenCalledWith(expectedMCRequests);
      expect(infoLogSpy.mock.calls[0][0]).toBe(EventLogging.SMC_PROHIBITION_FEED_INIT);
      expect(infoLogSpy.mock.calls[1][0]).toBe(`Processing record with messageId: ${event.Records[0].messageId}`);
      expect(errorLogSpy.mock.calls[0][0]).toBe(`Error processing record: ${JSON.stringify(event.Records[0])}`);
      expect(errorLogSpy.mock.calls[1][0]).toBe("\"Oh no!\"");
      expect(infoLogSpy.mock.calls[2][0])
        .toBe(`${EventLogging.SMC_PROHIBITION_FEED_FAILURE}: itemIdentifier: ${event.Records[0].messageId}`);
    });

    it('should log and not call sendMCProhibition if mcRequests is empty after extracting test results', async () => {
      process.env.SEND_TO_SMC = 'True';
      const expectedMCRequests: MCRequest[] = [];
      const expectedResponse = {"batchItemFailures": []};

      jest.mocked(extractMCTestResults).mockReturnValue(expectedMCRequests);

      const result = await handler(event, null, null);
      expect(result).toEqual(expectedResponse);
      expect(sendMCProhibition).toHaveBeenCalledTimes(0);
      expect(infoLogSpy.mock.calls[0][0]).toBe(EventLogging.SMC_PROHIBITION_FEED_INIT);
      expect(infoLogSpy.mock.calls[1][0]).toBe(`Processing record with messageId: ${event.Records[0].messageId}`);
      expect(infoLogSpy.mock.calls[2][0])
        .toBe(`No relevant MC test results found in the record: ${event.Records[0].body}`);
    });

    it('should handle a false environment variable', async () => {
      process.env.SEND_TO_SMC = 'false';

      const result = await handler(event, null, null);

      expect(result).toEqual({"batchItemFailures": []});
      expect(sendMCProhibition).not.toHaveBeenCalled();
      expect(extractMCTestResults).not.toHaveBeenCalled();
      expect(infoLogSpy).toHaveBeenCalledWith('Function not triggered, Missing or not true environment variable present');
    });

    it('should handle a missing environment variable', async () => {
      delete process.env.SEND_TO_SMC;

      const result = await handler(event, null, null);

      expect(result).toEqual({"batchItemFailures": []});
      expect(extractMCTestResults).not.toHaveBeenCalled();
      expect(sendMCProhibition).not.toHaveBeenCalled();
      expect(infoLogSpy).toHaveBeenCalledWith('Function not triggered, Missing or not true environment variable present');
    });

    it('should handle an error that does not have a valid body', async () => {
      process.env.SEND_TO_SMC = 'TRUE';

      const invalidBody: SQSRecord = JSON.parse(JSON.stringify(event.Records[0]));
      invalidBody.body = 'invalid JSON to cause error';

      const eventWithError: SQSEvent = {
        Records: [invalidBody],
      };

      const expectedResponse = {
        batchItemFailures: [
          { itemIdentifier: eventWithError.Records[0].messageId },
        ],
      };

      const result = await handler(eventWithError, null, null);

      expect(result).toEqual(expectedResponse);
      expect(extractMCTestResults).not.toHaveBeenCalled();
      expect(sendMCProhibition).not.toHaveBeenCalled();
      expect(infoLogSpy.mock.calls[0][0]).toBe(EventLogging.SMC_PROHIBITION_FEED_INIT);
      expect(infoLogSpy.mock.calls[1][0]).toBe(`Processing record with messageId: ${event.Records[0].messageId}`);
      expect(errorLogSpy.mock.calls[0][0]).toBe(`Error processing record: ${JSON.stringify(eventWithError.Records[0])}`);
      expect(errorLogSpy.mock.calls[1][0]).toBe("\"Unexpected token i in JSON at position 0\"");
      expect(infoLogSpy.mock.calls[2][0])
        .toBe(`${EventLogging.SMC_PROHIBITION_FEED_FAILURE}: itemIdentifier: ${event.Records[0].messageId}`);
    });

    it('should add only 1 record to batchItemFailures if one of two records fails', async () => {
      process.env.SEND_TO_SMC = 'TRUE';

      const passingRecord: SQSRecord = JSON.parse(JSON.stringify(event.Records[0]));
      const failingRecord: SQSRecord = JSON.parse(JSON.stringify(event.Records[0]));
      failingRecord.messageId = '1317d15-a23b2-4c68-a2da-67c999999999';

      const eventWithTwoRecords: SQSEvent = {
        Records: [passingRecord, failingRecord],
      };

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

      const result = await handler(eventWithTwoRecords, null, null);

      console.log(result.batchItemFailures.length);

      expect(result).toEqual(expectedResponse);
      expect(sendMCProhibition).toHaveBeenCalledTimes(2);
      expect(sendMCProhibition).toHaveBeenCalledWith(expectedMCRequests);
      expect(infoLogSpy.mock.calls[0][0]).toBe(EventLogging.SMC_PROHIBITION_FEED_INIT);
      expect(infoLogSpy.mock.calls[1][0]).toBe(`Processing record with messageId: ${eventWithTwoRecords.Records[0].messageId}`);
      expect(infoLogSpy.mock.calls[2][0])
        .toBe(`${EventLogging.SMC_PROHIBITION_FEED_SUCCESS}: itemIdentifier: ${eventWithTwoRecords.Records[0].messageId}`);
      expect(infoLogSpy.mock.calls[3][0]).toBe(`Processing record with messageId: ${eventWithTwoRecords.Records[1].messageId}`);
      expect(errorLogSpy.mock.calls[0][0]).toBe(`Error processing record: ${JSON.stringify(eventWithTwoRecords.Records[1])}`);
      expect(errorLogSpy.mock.calls[1][0]).toBe("\"Oh no!\"");
      expect(infoLogSpy.mock.calls[4][0])
        .toBe(`${EventLogging.SMC_PROHIBITION_FEED_FAILURE}: itemIdentifier: ${eventWithTwoRecords.Records[1].messageId}`);
    });

    it('should handle error with no message', async () => {
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

      const mockError = new Error();

      jest.mocked(extractMCTestResults).mockReturnValue(expectedMCRequests);
      jest.mocked(sendMCProhibition).mockRejectedValue(mockError);

      const result = await handler(event, null, null);

      expect(result).not.toBeNull();
      expect(infoLogSpy.mock.calls[0][0]).toBe(EventLogging.SMC_PROHIBITION_FEED_INIT);
      expect(infoLogSpy.mock.calls[1][0]).toBe(`Processing record with messageId: ${event.Records[0].messageId}`);
      expect(errorLogSpy.mock.calls[0][0]).toBe(`Error processing record: ${JSON.stringify(event.Records[0])}`);
      expect(errorLogSpy.mock.calls[1][0]).toBe(mockError);
      expect(infoLogSpy.mock.calls[2][0])
        .toBe(`${EventLogging.SMC_PROHIBITION_FEED_FAILURE}: itemIdentifier: ${event.Records[0].messageId}`);
    });
  });
});


