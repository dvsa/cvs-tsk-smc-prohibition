/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/ban-ts-comment */
import { EventBridge, Request } from 'aws-sdk';
import { mocked } from 'ts-jest/utils';
import { PutEventsResponse, PutEventsRequest, PutEventsResultEntry } from 'aws-sdk/clients/eventbridge';
import { sendMCProhibition } from '../../src/eventbridge/Send';
import { SendResponse } from '../../src/eventbridge/SendResponse';
import { MCRequest } from '../../src/utils/MCRequest';

jest.mock('aws-sdk', () => {
  const mEventBridgeInstance = {
    putEvents: jest.fn(),
  };
  const mRequestInstance = {
    promise: jest.fn(),
  };
  const mEventBridge = jest.fn(() => mEventBridgeInstance);
  const mRequest = jest.fn(() => mRequestInstance);

  return {
    EventBridge: mEventBridge,
    Request: mRequest,
  };
});

type PutEventsWithParams = (params: PutEventsRequest) => AWS.Request<PutEventsResponse, AWS.AWSError>;

const mEventBridgeInstance = new EventBridge();
const mResultInstance = new Request<PutEventsResponse, AWS.AWSError>(null, null);
// eslint-disable-next-line @typescript-eslint/unbound-method
mocked(mEventBridgeInstance.putEvents as PutEventsWithParams)
  .mockImplementation(
    (params: PutEventsRequest): AWS.Request<PutEventsResponse, AWS.AWSError> => {
      const mPutEventsResponse: PutEventsResponse = {
        FailedEntryCount: 0,
        Entries: Array<PutEventsResultEntry>(params.Entries.length),
      };
      if (params.Entries[0].Detail === '{ "testResult": "{\\"vehicleIdentifier\\":\\"test\\",\\"testDate\\":\\"\\",\\"vin\\":\\"\\",\\"testResult\\":\\"\\",\\"hgvPsvTrailFlag\\":\\"\\"}" }') {
        mResultInstance.promise = jest.fn()
          .mockReturnValue(Promise.reject(new Error('Oh no!')));
      } else {
        mResultInstance.promise = jest.fn()
          .mockReturnValue(Promise.resolve(mPutEventsResponse));
      }
      return mResultInstance;
    },
  );

describe('Events sent', () => {
  it('When one event with multiple test types are returned', async () => {
    const mcRequests: MCRequest[] = [
      {
        vehicleIdentifier: 'JY58FPP',
        testDate: '14/01/2019',
        vin: 'XMGDE02FS0H012303',
        testResult: 'R',
        hgvPsvTrailFlag: 'PSV',
        testResultId: '98978979889',
      },
      {
        vehicleIdentifier: 'JY58FPP',
        testDate: '14/01/2019',
        vin: 'XMGDE02FS0H012303',
        testResult: 'R',
        hgvPsvTrailFlag: 'PSV',
        testResultId: '98978979889',
      },
    ];

    const mSendResponse: SendResponse = {
      SuccessCount: 2,
      FailCount: 0,
    };
    await expect(sendMCProhibition(mcRequests))
      .resolves
      .toEqual(mSendResponse);
  });

  it('When the mc requests are null an error is returned', async () => {
    const mSendResponse: SendResponse = {
      SuccessCount: 0,
      FailCount: 1,
    };
    await expect(sendMCProhibition(null)).resolves.toEqual(mSendResponse);
  });
});
