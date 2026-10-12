import type { TaskManagerDriver } from '../src/driver';

/**
 * Adapter template. Copy this file (for example to adapters/implementation-a.ts),
 * implement every method for the implementation under test, and point
 * TM_ADAPTER at the copy. README.md, "Writing an adapter", lists the rules.
 */
const notImplemented = (method: string) => (): never => {
  throw new Error(`Adapter method "${method}" is not implemented. See README.md, "Writing an adapter".`);
};

export default function createDriver(): TaskManagerDriver {
  return {
    sessionCookieName: process.env.TM_SESSION_COOKIE ?? '',

    register: notImplemented('register'),
    login: notImplemented('login'),
    logout: notImplemented('logout'),
    isAuthenticated: notImplemented('isAuthenticated'),
    availableFeatures: notImplemented('availableFeatures'),

    createUser: notImplemented('createUser'),
    userRef: notImplemented('userRef'),
    unknownUserRef: notImplemented('unknownUserRef'),

    createTask: notImplemented('createTask'),
    findTaskByTitle: notImplemented('findTaskByTitle'),
    listAllTasks: notImplemented('listAllTasks'),
    listMyTasks: notImplemented('listMyTasks'),
    viewTask: notImplemented('viewTask'),

    editTask: notImplemented('editTask'),
    changeStatus: notImplemented('changeStatus'),
    cancelTask: notImplemented('cancelTask'),
    reassignTask: notImplemented('reassignTask'),
    reportProgress: notImplemented('reportProgress'),

    forgedCancelRequest: notImplemented('forgedCancelRequest'),

    // Optional test-data hooks. Leave them out to skip the tests that need them.
    // storedPasswordHash: async (email) => { ... },
    // forceDeadline: async (task, deadline) => { ... },
  };
}
