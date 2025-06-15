export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export const onRequestError = async (
  err: unknown,
  request: {
    path: string;
    method: string;
    headers: Record<string, string | string[] | undefined>;
  },
  context: {
    routerKind: string;
    routePath: string;
    routeType: string;
  }
) => {
  // Import Sentry dynamically to avoid issues
  const Sentry = await import('@sentry/nextjs');
  
  // Capture the error with additional context
  Sentry.captureException(err, {
    tags: {
      component: 'request-handler',
      path: request.path,
      method: request.method,
      routerKind: context.routerKind,
      routeType: context.routeType,
    },
    extra: {
      routePath: context.routePath,
      userAgent: request.headers['user-agent'],
    },
  });
};