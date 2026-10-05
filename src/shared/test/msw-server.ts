import { setupServer } from 'msw/node';

/** Shared MSW server; every test registers its own GREEN-API handlers via `mswServer.use()`. */
export const mswServer = setupServer();
