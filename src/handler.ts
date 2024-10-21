/* eslint-disable */

import { Context, Callback, SQSEvent, DynamoDBRecord, SQSBatchItemFailure } from 'aws-lambda';
import { extractMCTestResults } from './utils/ExtractTestResults';
import { sendMCProhibition } from './eventbridge/Send';
import logger from './observability/Logger';
import { MCRequest } from './utils/MCRequest';

const handler = async (
  event: SQSEvent,
  _context: Context,
  _callback: Callback,
) => {
  const { NODE_ENV, SERVICE, AWS_REGION, AWS_STAGE, SEND_TO_SMC } = process.env;

  logger.debug(
    `\nRunning Service:\n '${SERVICE}'\n mode: ${NODE_ENV}\n stage: '${AWS_STAGE}'\n region: '${AWS_REGION}'\n 
  Send to smc: ${SEND_TO_SMC}\n`,
  );

  const batchItemFailures: SQSBatchItemFailure[] = [];

  if (SEND_TO_SMC?.toUpperCase() === 'TRUE') {
    logger.debug(`Function triggered with '${JSON.stringify(event)}'.`);

    for (const record of event.Records) {

      try {
        const dynamoDBEvent: DynamoDBRecord = JSON.parse(record.body) as DynamoDBRecord;

        if (dynamoDBEvent?.eventName === 'REMOVE') {
          logger.info(`Record has REMOVE event name, skipping record: ${JSON.stringify(dynamoDBEvent)}`);
          continue;
        }

        const mcRequests: MCRequest[] = extractMCTestResults(dynamoDBEvent);

        if (mcRequests.length > 0) {
          await sendMCProhibition(mcRequests);
        } else {
          logger.info(`No relevant MC test results found in the record: ${JSON.stringify(dynamoDBEvent)}`);
        }
      } catch (error) {
        logger.error(`Error processing record: ${JSON.stringify(record)}`);
        if (error.message) {
          logger.error(JSON.stringify(error.message));
        } else {
          logger.error(error);
        }
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }
  } else {
    logger.info('Function not triggered, Missing or not true environment variable present');
  }

  return { batchItemFailures };
};

export { handler };
