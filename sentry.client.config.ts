import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://3287253c6a7286596f8f26ca1d9b90b9@o4509502648549376.ingest.us.sentry.io/4509502657134592",

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: process.env.NODE_ENV === 'development',

  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: false,
      blockAllMedia: false,
    }),
  ],

  // Set environment
  environment: process.env.NODE_ENV,

  // Add release information
  release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',

  // Configure beforeSend to filter out sensitive data
  beforeSend(event) {
    // Filter out sensitive headers and data
    if (event.request?.headers) {
      delete event.request.headers['authorization'];
      delete event.request.headers['cookie'];
    }
    
    // Don't send events for localhost in development
    if (process.env.NODE_ENV === 'development' && event.request?.url?.includes('localhost')) {
      return null;
    }
    
    return event;
  },
});