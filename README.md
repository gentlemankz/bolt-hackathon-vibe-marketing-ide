# Facebook Marketing API Integration

This project implements a complete integration with the Facebook Marketing API, allowing users to view their ad accounts, campaigns, ad sets, and ads, along with real-time performance metrics.

## Features

- OAuth authentication with Facebook
- Retrieve and display ad accounts, campaigns, ad sets, and ads
- Real-time metrics dashboard with interactive charts
- Automatic syncing of metrics data
- Supabase Realtime for instant updates of marketing data

## Technology Stack

- Next.js 14 with App Router
- TypeScript
- Supabase for authentication and database
- Facebook Marketing API v23.0
- Recharts for data visualization
- TailwindCSS and Shadcn UI components

## Real-time Metrics Features

The application includes comprehensive support for real-time Facebook marketing metrics:

- **Time-series Database**: Stores historical metrics data with timestamps
- **Supabase Realtime**: Subscribes to real-time updates when metrics change
- **Automated Syncing**: Background jobs to keep metrics up-to-date
- **Interactive Dashboard**: Visualize performance data with customizable charts
- **Multi-level Metrics**: Track metrics at campaign, ad set, and ad levels

## Getting Started

1. Clone the repository
2. Install dependencies with `npm install`
3. Set up environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   NEXT_PUBLIC_FACEBOOK_APP_ID=your-facebook-app-id
   FACEBOOK_APP_SECRET=your-facebook-app-secret
   NEXT_PUBLIC_BASE_URL=your-app-url
   CRON_SECRET_KEY=your-cron-secret
   ```
4. Run the development server: `npm run dev`

## Automatic Data Syncing

The application includes two levels of automatic data synchronization:

### 1. Initial Data Loading

When a user connects a Facebook ad account, the system automatically:
- Fetches and stores all campaigns, ad sets, and ads
- Syncs the initial metrics data for all entities
- Displays the data in the UI without requiring manual refreshes

### 2. Scheduled Metrics Syncing

Metrics are automatically synced via a scheduled job that runs hourly using Vercel Cron:

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/sync-facebook-metrics?key=${CRON_SECRET_KEY}",
      "schedule": "0 * * * *"
    }
  ]
}
```

This keeps all metrics up-to-date even when users aren't actively using the application.

### 3. Real-time Updates

The application uses Supabase Realtime to subscribe to database changes, ensuring that:
- New metrics are immediately displayed in the UI
- Changes to ad accounts, campaigns, or ads are reflected in real-time
- Users see the most current data without refreshing the page

## Database Schema

The application uses the following database structure:

- `facebook_tokens`: Stores Facebook access tokens
- `facebook_ad_accounts`: Ad account information
- `facebook_campaigns`: Campaign data
- `facebook_ad_sets`: Ad set data
- `facebook_ads`: Ad data and creative information
- `facebook_campaign_metrics`: Time-series metrics for campaigns
- `facebook_adset_metrics`: Time-series metrics for ad sets
- `facebook_ad_metrics`: Time-series metrics for ads
- `facebook_sync_jobs`: Tracks background sync jobs

## API Endpoints

- `/api/auth/facebook/callback`: OAuth callback handler
- `/api/facebook/ad-accounts`: Manage ad accounts
- `/api/facebook/campaigns`: Manage campaigns
- `/api/facebook/adsets`: Manage ad sets
- `/api/facebook/ads`: Manage ads
- `/api/facebook/metrics`: Get metrics data
- `/api/facebook/sync-metrics`: Manually trigger metrics sync
- `/api/cron/sync-facebook-metrics`: Scheduled metrics syncing

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
