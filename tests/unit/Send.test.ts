/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import {
  EventBridgeClient,
  PutEventsCommand,
  PutEventsCommandInput,
  PutEventsCommandOutput,
  PutEventsResultEntry,
} from '@aws-sdk/client-eventbridge';
import { mockClient } from 'aws-sdk-client-mock';
import { sendMCProhibition } from '../../src/eventbridge/Send';
import { SendResponse } from '../../src/eventbridge/SendResponse';
import { MCRequest } from '../../src/utils/MCRequest';

const mEventBridgeInstance = mockClient(EventBridgeClient);

mEventBridgeInstance.on(PutEventsCommand).callsFake(
  (params: PutEventsCommandInput): PutEventsCommandOutput => {
    const mPutEventsResponse: PutEventsCommandOutput = {
      FailedEntryCount: 0,
      Entries: Array<PutEventsResultEntry>(params.Entries.length),
      $metadata: undefined,
    };
    if (
      params.Entries[0].Detail ===
      '{ "testResult": "{\\"vehicleIdentifier\\":\\"test\\",\\"testDate\\":\\"\\",\\"vin\\":\\"\\",\\"testResult\\":\\"\\",\\"hgvPsvTrailFlag\\":\\"\\"}" }'
    ) {
      throw new Error('Oh no!');
    } else {
      return mPutEventsResponse;
    }
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
    await expect(sendMCProhibition(mcRequests)).resolves.toEqual(mSendResponse);
  });

  it('When the mc requests are null an error is returned', async () => {
    const mSendResponse: SendResponse = {
      SuccessCount: 0,
      FailCount: 1,
    };
    await expect(sendMCProhibition(null)).resolves.toEqual(mSendResponse);
  });
});
