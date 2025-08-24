import pino from 'pino';

const logger = pino({
  redact: { paths: ['req.headers.authorization', 'variables.*', 'data.*'], remove: true },
});

export const redactLogs = () => ({
  async requestDidStart({ request }: any) {
    logger.info({ op: request.operationName }, 'op start');
  },
  async willSendResponse({ response }: any) {
    logger.info({ status: response?.http?.status }, 'op done');
  },
});
