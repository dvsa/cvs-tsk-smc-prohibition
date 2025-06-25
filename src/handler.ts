/* eslint-disable */

import { Context, Callback, SQSEvent, DynamoDBRecord, SQSBatchItemFailure } from 'aws-lambda';
import { extractMCTestResults } from './utils/ExtractTestResults';
import { sendMCProhibition } from './eventbridge/Send';
import logger from './observability/Logger';
import { MCRequest } from './utils/MCRequest';
import { EventLogging } from "./utils/EventLogging";

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
    logger.info(`${EventLogging.SMC_PROHIBITION_FEED_INIT}`);

    for (const record of event.Records) {
      try {
          logger.info(`Processing record with messageId: ${record.messageId}`);
        const dynamoDBEvent: DynamoDBRecord = JSON.parse(record.body) as DynamoDBRecord;
        const mcRequests: MCRequest[] = extractMCTestResults(dynamoDBEvent);

        if (mcRequests.length > 0) {
          await sendMCProhibition(mcRequests);
          logger.info(`${EventLogging.SMC_PROHIBITION_FEED_SUCCESS}: itemIdentifier: ${record.messageId}`);
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
        logger.info(`${EventLogging.SMC_PROHIBITION_FEED_FAILURE}: itemIdentifier: ${record.messageId}`);
        batchItemFailures.push({ itemIdentifier: record.messageId });
      }
    }
  } else {
    logger.info('Function not triggered, Missing or not true environment variable present');
  }

  return { batchItemFailures };
};

export { handler };
