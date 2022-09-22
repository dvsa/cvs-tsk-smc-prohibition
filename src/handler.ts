/* eslint-disable no-restricted-syntax */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import 'source-map-support/register';
import { DynamoDBStreamEvent, Context, Callback } from 'aws-lambda';
import { extractMCTestResults } from './utils/extractTestResults';
import { sendMCProhibition } from './eventbridge/send';
import logger from './observability/logger';
import { MCRequest } from './utils/MCRequest';

const {
  NODE_ENV, SERVICE, AWS_REGION, AWS_STAGE,
} = process.env;

logger.debug(
  `\nRunning Service:\n '${SERVICE}'\n mode: ${NODE_ENV}\n stage: '${AWS_STAGE}'\n region: '${AWS_REGION}'\n\n`,
);

const handler = async (event: DynamoDBStreamEvent, _context: Context, callback: Callback) => {
  try {
    logger.debug(`Function triggered with '${JSON.stringify(event)}'.`);

    // We want to process these in sequence to maintain order of database changes
    for (const record of event.Records) {
      try {
        const mcRequests: MCRequest[] = extractMCTestResults(record);
        if (mcRequests != null) {
          // eslint-disable-next-line no-await-in-loop
          await sendMCProhibition(mcRequests);
        }
      } catch (e) {
        logger.error('Error when clearing the MC prohibition:', e);
      }
    }

    logger.info('Data processed successfully.');
    callback(null, 'Data processed successfully.');
  } catch (error) {
    logger.info('Data processed unsuccessfully.');
    logger.error('', error);
    callback(new Error('Data processed unsuccessfully.'));
  }
};

export { handler };
