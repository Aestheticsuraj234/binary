import type {Approval} from '@binary/shared';
import {Hono} from 'hono';

import {decideApproval} from '../approvals/decide';
import {requireUser, type AppEnv} from '../app-env';
import type {AppDependencies} from '../container';
import {NotFoundError} from '../errors';
import {toRunView} from './routines';
import {isUuid} from './ids';

type ApprovalRow = Awaited<
  ReturnType<AppDependencies['approvals']['listPendingForUser']>
>[number];

export function toApprovalView(row: ApprovalRow): Approval {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    decidedAt: row.decidedAt?.toISOString() ?? null,
  };
}

/** What agents asked to do, and the user's answers. */
export function approvalRoutes(deps: AppDependencies) {
  const {approvals} = deps;
  const routes = new Hono<AppEnv>();
  routes.use(requireUser);

  routes.get('/', async (c) => {
    const pending = await approvals.listPendingForUser(c.get('user').id);
    return c.json({approvals: pending.map(toApprovalView)});
  });

  for (const decision of ['approved', 'rejected'] as const) {
    const path = decision === 'approved' ? '/:id/approve' : '/:id/reject';
    routes.post(path, async (c) => {
      const userId = c.get('user').id;
      const id = c.req.param('id');
      if (!isUuid(id)) {
        throw new NotFoundError('Request');
      }
      const result = await decideApproval(deps, {
        userId,
        approvalId: id,
        decision,
      });
      const approval = await approvals.findForUser(userId, id);
      return c.json({
        approval: approval && toApprovalView(approval),
        ...result,
      });
    });
  }

  return routes;
}

/** Today: what waits for the user, and what their routines did today. */
export function todayRoutes({approvals, routineRuns}: AppDependencies) {
  const routes = new Hono<AppEnv>();
  routes.use(requireUser);

  routes.get('/', async (c) => {
    const userId = c.get('user').id;
    // "Today" is the last 24 hours: the API doesn't know the user's zone.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [pending, runs] = await Promise.all([
      approvals.listPendingForUser(userId),
      routineRuns.listForUserSince(userId, since),
    ]);
    return c.json({
      approvals: pending.map(toApprovalView),
      runs: runs.map(({routine, agent, ...run}) => ({
        ...toRunView({...run, routineId: routine.id}),
        routine,
        agent,
      })),
    });
  });

  // The sidebar's badge: just a number, cheap to ask for on every page.
  routes.get('/count', async (c) => {
    return c.json({
      pending: await approvals.countPendingForUser(c.get('user').id),
    });
  });

  return routes;
}
