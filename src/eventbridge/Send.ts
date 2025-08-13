/* eslint-disable security/detect-object-injection */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
// eslint-disable-next-line import/no-extraneous-dependencies
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import logger from '../observability/Logger';
import { MCRequest } from '../utils/MCRequest';
import { Entries } from './Entries';
import { EventEntry } from './EventEntry';
import { SendResponse } from './SendResponse';

const eventBridge = new EventBridgeClient();
const sendMCProhibition = async (
  mcRequests: MCRequest[],
): Promise<SendResponse> => {
  const sendResponse: SendResponse = {
    SuccessCount: 0,
    FailCount: 0,
  };
  try {
    for (let i = 0; i < mcRequests.length; i++) {
      const mcRequest = mcRequests[i];
      const entry: EventEntry = {
        Source: process.env.AWS_EVENT_BUS_SOURCE,
        Detail: JSON.stringify(mcRequest),
        DetailType: 'CVS MC Clear Prohibition',
        EventBusName: process.env.AWS_EVENT_BUS_NAME,
        Time: new Date(),
      };
      const params: Entries = {
        Entries: [],
      };
      params.Entries.push(entry);
      const command = new PutEventsCommand(params);
      // eslint-disable-next-line no-await-in-loop
      await eventBridge.send(command);
      sendResponse.SuccessCount++;
    }
  } catch (error) {
    logger.error('', error);
    sendResponse.FailCount++;
  }
  return sendResponse;
};

export { sendMCProhibition };
