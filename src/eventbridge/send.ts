import { EventBridge } from 'aws-sdk';
import { EventEntry } from './EventEntry';
import { Entries } from './Entries';
import { SendResponse } from './SendResponse';
import logger from '../observability/logger';
import { MCRequest } from '../utils/MCRequest';

const eventbridge = new EventBridge();
// eslint-disable-next-line @typescript-eslint/require-await
const sendMCProhibition = async (mcRequests: MCRequest[]): Promise<SendResponse> => {
  const sendResponse: SendResponse = {
    SuccessCount: 0,
    FailCount: 0,
  };
  try {
    for (let i = 0; i < mcRequests.length; i++) {
      const x = mcRequests[i];
      const entry: EventEntry = {
        Source: process.env.AWS_EVENT_BUS_SOURCE,
        Detail: `{ "testResult": "${JSON.stringify(x).replace(/"/g, '\\"')}" }`,
        DetailType: 'CVS MC Clear Prohibition',
        EventBusName: process.env.AWS_EVENT_BUS_NAME,
        Time: new Date(),
      };
      const params: Entries = {
        Entries: [],
      };
      params.Entries.push(entry);

      logger.debug(`event about to be sent: ${JSON.stringify(params)}`);
      // eslint-disable-next-line no-await-in-loop
      const result = await eventbridge.putEvents(params).promise();
      logger.info(JSON.stringify(result));
      logger.info(
        `${result.Entries.length} event sent to eventbridge.`,
      );
      console.log('event send to eventbridge');
      sendResponse.SuccessCount++;
    }
  } catch (error) {
    logger.error('', error);
    sendResponse.FailCount++;
  }
  return sendResponse;
};

export { sendMCProhibition };
