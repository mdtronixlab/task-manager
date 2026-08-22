// Central error handling (rules.md §29 / prd.md §20): known AppErrors
// return their specific code/message; anything unexpected is logged with
// full detail server-side and shown to the client as a generic, friendly
// message — never a raw stack trace.

import { AppError } from '../lib/errors.js';
import { error } from '../lib/response.js';

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json(error(err.code, err.message));
  }

  // express.json() throws this for malformed request bodies.
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json(error('INVALID_REQUEST', 'Request body must be valid JSON.'));
  }

  console.error('Unexpected error:', err);
  res
    .status(500)
    .json(error('INTERNAL_ERROR', 'Something went wrong while processing your request. Please try again.'));
}
