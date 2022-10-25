/* eslint-disable */
//TODO fix eslint

/* eslint-disable no-restricted-syntax */
import { DynamoDBStreamEvent, Context, Callback } from 'aws-lambda';
import { extractMCTestResults } from './utils/extractTestResults';
import { sendMCProhibition } from './eventbridge/send';
import logger from './observability/logger';
import { MCRequest } from './utils/MCRequest';
import { SendResponse } from './eventbridge/SendResponse';
import { HTTPError } from './utils/HTTPError';

const {
  NODE_ENV, SERVICE, AWS_REGION, AWS_STAGE,
} = process.env;

logger.debug(
  `\nRunning Service:\n '${SERVICE}'\n mode: ${NODE_ENV}\n stage: '${AWS_STAGE}'\n region: '${AWS_REGION}'\n\n`,
);

const handler = async (event: DynamoDBStreamEvent, _context: Context, callback: Callback): Promise<SendResponse> => {
  try {
    logger.debug(`Function triggered with '${JSON.stringify(event)}'.`);

    // We want to process these in sequence to maintain order of database changes
    for (const record of event.Records) {
      const mcRequests: MCRequest[] = extractMCTestResults(record);
      if (mcRequests != null) {
        // eslint-disable-next-line no-await-in-loop
        return await sendMCProhibition(mcRequests);
      }
    }
    callback(null, 'Data processed successfully.');
  } catch (error: unknown) {

    logger.error('Data processed unsuccessfully.');
    logger.error('', error);
    callback('', (<HTTPError>error).body);
  }
};

export { handler };
