import { EventBridge } from 'aws-sdk';
import { EventEntry } from './EventEntry';
import { Entries } from './Entries';
import { SendResponse } from './SendResponse';
import logger from '../observability/Logger';
import { MCRequest } from '../utils/MCRequest';

const eventbridge = new EventBridge();
const sendMCProhibition = async (mcRequests: MCRequest[]): Promise<SendResponse> => {
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
      // eslint-disable-next-line no-await-in-loop
      await eventbridge.putEvents(params).promise();
      sendResponse.SuccessCount++;
    }
  } catch (error) {
    logger.error('', error);
    sendResponse.FailCount++;
  }
  return sendResponse;
};

export { sendMCProhibition };
