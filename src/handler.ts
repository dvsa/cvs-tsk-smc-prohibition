/* eslint-disable */

import { DynamoDBStreamEvent, Context, Callback } from 'aws-lambda';
import { extractMCTestResults } from './utils/ExtractTestResults';
import { sendMCProhibition } from './eventbridge/Send';
import logger from './observability/Logger';
import { MCRequest } from './utils/MCRequest';

const { NODE_ENV, SERVICE, AWS_REGION, AWS_STAGE } = process.env;

logger.debug(
  `\nRunning Service:\n '${SERVICE}'\n mode: ${NODE_ENV}\n stage: '${AWS_STAGE}'\n region: '${AWS_REGION}'\n\n`,
);

const handler = async (
  event: DynamoDBStreamEvent,
  _context: Context,
  callback: Callback,
) => {
  try {
    logger.debug(`Function triggered with '${JSON.stringify(event)}'.`);

    // We want to process these in sequence to maintain order of database changes
    for (const record of event.Records) {
      const mcRequests: MCRequest[] = extractMCTestResults(record);
      if (mcRequests != null) {
        await sendMCProhibition(mcRequests);
      }
    }
    callback(null, 'Data processed successfully.');
  } catch (error) {
    if (error.body) {
      logger.error(JSON.stringify(error.body));
      callback(
        null,
        `Data processed unsuccessfully: ${JSON.stringify(error.body)}`,
      );
    } else {
      logger.error(JSON.stringify(error.body));
      callback(null, `Data processed unsuccessfully: ${error}`);
    }
  }
};

export { handler };
