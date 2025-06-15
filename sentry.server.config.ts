import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://3287253c6a7286596f8f26ca1d9b90b9@o4509502648549376.ingest.us.sentry.io/4509502657134592",

  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});