/* eslint-disable */

import { Context, Callback, SQSEvent, DynamoDBRecord } from 'aws-lambda';
import { extractMCTestResults } from './utils/ExtractTestResults';
import { sendMCProhibition } from './eventbridge/Send';
import logger from './observability/Logger';
import { MCRequest } from './utils/MCRequest';

const handler = async (
  event: SQSEvent,
  _context: Context,
  callback: Callback,
) => {
  let { NODE_ENV, SERVICE, AWS_REGION, AWS_STAGE, SEND_TO_SMC } = process.env;

  logger.debug(
    `\nRunning Service:\n '${SERVICE}'\n mode: ${NODE_ENV}\n stage: '${AWS_STAGE}'\n region: '${AWS_REGION}'\n 
  Send to smc: ${SEND_TO_SMC}\n`,
  );
  if (SEND_TO_SMC != undefined && SEND_TO_SMC.toUpperCase() === 'TRUE') {
    try {
      logger.debug(`Function triggered with '${JSON.stringify(event)}'.`);

      for (const record of event.Records) {
        const dynamoDBEvent: DynamoDBRecord = JSON.parse(record.body) as DynamoDBRecord;
        if (dynamoDBEvent){
          const mcRequests: MCRequest[] = extractMCTestResults(dynamoDBEvent);

          if (mcRequests != null && mcRequests.length > 0) {
            await sendMCProhibition(mcRequests);
          } else {
            logger.info(`No relevant MC test results found in the record: ${JSON.stringify(dynamoDBEvent)}`);
          }
        } else {
          logger.info('Function not triggered, empty notification.');
          callback(null, 'Function not triggered, empty notification.');
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
        logger.error(error);
        callback(null, `Data processed unsuccessfully: ${error}`);
      }
    }
  } else {
    logger.info(
      'Function not triggered, Missing or not true environment variable present',
    );
    callback(
      null,
      'Function not triggered, Missing or not true environment variable present',
    );
  }
};

export { handler };
