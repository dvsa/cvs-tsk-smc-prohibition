/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable no-underscore-dangle */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable import/no-unresolved */

import { EOL } from 'os';
import logger from '../../src/observability/Logger';

process.env.LOG_LEVEL = 'debug';

describe('logger functions', () => {
  it('GIVEN a logger WHEN an info is logged THEN the console message is correct.', () => {
    // @ts-ignore
    const consoleSpy = jest.spyOn(console._stdout, 'write');
    logger.info('I am an info message!');
    expect(consoleSpy).toHaveBeenCalledWith(`info: I am an info message!${EOL}`);
  });

  it('GIVEN a logger WHEN an error is logged THEN the console message is correct.', () => {
    // @ts-ignore
    const consoleSpy = jest.spyOn(console._stdout, 'write');
    logger.error('I am an error message!');
    expect(consoleSpy).toHaveBeenCalledWith(`error: I am an error message!${EOL}`);
  });
});
