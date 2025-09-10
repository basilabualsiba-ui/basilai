-- Create CRON job to fetch prayer times daily at midnight
SELECT cron.schedule(
  'fetch-daily-prayer-times',
  '0 0 * * *', -- Every day at midnight
  $$
  SELECT
    net.http_post(
        url:='https://sfreodzibxmniiccqpcl.supabase.co/functions/v1/fetch-prayer-times',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmcmVvZHppYnhtbmlpY2NxcGNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MzA1ODIsImV4cCI6MjA3MTAwNjU4Mn0.IjwnGiLJu8C8old6KnYgNE6yFlVGGZPOiCPS234hwwQ"}'::jsonb,
        body:='{"city": "Ramallah", "country": "Palestine", "method": "4"}'::jsonb
    ) as request_id;
  $$
);