# Remote Database Migration Guide

This guide explains how to migrate from Lovable Cloud to your own remote Supabase instance while maintaining all features.

## Prerequisites

- Ubuntu 22.04 Server
- Docker and Docker Compose installed
- Remote Supabase instance (self-hosted or Supabase Cloud)

## Step 1: Set Up Remote Supabase Instance

### Option A: Self-Hosted Supabase on Ubuntu 22.04

```bash
# Install Docker
sudo apt update
sudo apt install -y docker.io docker-compose
sudo systemctl enable docker
sudo systemctl start docker

# Clone Supabase
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker

# Configure environment
cp .env.example .env
nano .env  # Edit with your settings

# Start Supabase
docker-compose up -d
```

### Option B: Use Supabase Cloud

1. Go to https://supabase.com
2. Create a new project
3. Note your project URL and API keys

## Step 2: Backup Current Database

Use the provided backup edge function to export your data:

```bash
# Trigger backup via API
curl -X POST https://your-project.lovable.app/functions/v1/backup-database \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

This will create a JSON backup of all tables.

## Step 3: Run Migrations on Remote Database

1. Copy all migration files from `supabase/migrations/` directory
2. Run them on your remote database in order:

```bash
# Using Supabase CLI
supabase db push --db-url "postgresql://postgres:password@your-remote-db:5432/postgres"

# Or manually using psql
psql "postgresql://postgres:password@your-remote-db:5432/postgres" < migration_file.sql
```

## Step 4: Configure Storage Buckets

Recreate storage buckets on remote instance:

```sql
-- Run on remote database
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true);

-- Apply storage policies (copy from migrations)
```

## Step 5: Migrate Data

Use the restore function to import your backed-up data:

```bash
# Upload backup JSON to remote instance
# Then run restore via edge function
curl -X POST https://your-remote-db.supabase.co/functions/v1/restore-database \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d @backup.json
```

## Step 6: Update Application Configuration

### Environment Variables

Create a `.env.local` file (this will override Lovable Cloud settings):

```env
# Remote Database Configuration
VITE_USE_REMOTE_DB=true
VITE_REMOTE_SUPABASE_URL=https://your-project.supabase.co
VITE_REMOTE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
VITE_REMOTE_SUPABASE_PROJECT_ID=your_project_id

# Keep Lovable Cloud as backup (optional)
VITE_LOVABLE_CLOUD_ENABLED=true
```

### Update Supabase Client

The application uses `src/lib/supabase-config.ts` to determine which database to use.

## Step 7: Deploy Edge Functions to Remote

```bash
# Using Supabase CLI
supabase functions deploy backup-database --project-ref your-project-id
supabase functions deploy restore-database --project-ref your-project-id
```

## Step 8: Configure Authentication

On your remote Supabase instance:

1. Go to Authentication → Settings
2. Set Site URL: `https://your-domain.com`
3. Add Redirect URLs:
   - `https://your-domain.com/**`
   - `http://localhost:5173/**` (for development)
4. Enable Email provider
5. Disable email confirmations for faster testing (or configure SMTP)

## Step 9: Test Migration

1. Test user registration
2. Test wallet creation
3. Test logo upload
4. Test PIN authentication
5. Verify seed phrase generation

## Step 10: Disable Lovable Cloud (Optional)

Once everything is working on remote DB:

```env
VITE_USE_REMOTE_DB=true
VITE_LOVABLE_CLOUD_ENABLED=false
```

## Continuous Backup Strategy

### Automated Daily Backups

Create a cron job on your server:

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * curl -X POST https://your-app.com/functions/v1/backup-database -H "Authorization: Bearer $ANON_KEY" > /backups/db-backup-$(date +\%Y\%m\%d).json
```

### Backup to Remote DB (Sync)

Use the sync edge function to continuously replicate data:

```bash
# Run hourly sync from Lovable Cloud to Remote DB
0 * * * * curl -X POST https://your-app.com/functions/v1/sync-to-remote -H "Authorization: Bearer $SERVICE_ROLE_KEY"
```

## Rollback Procedure

If you need to rollback to Lovable Cloud:

```env
VITE_USE_REMOTE_DB=false
VITE_LOVABLE_CLOUD_ENABLED=true
```

Restart the application.

## Database Schema

All tables are automatically created via migrations:

- `profiles` - User profiles (no private keys)
- `encrypted_wallets` - Optional encrypted backups
- `system_admin` - Manager account info
- `user_roles` - Role-based access control

## Security Considerations

1. **Never store seed phrases unencrypted**
2. **Use strong encryption for optional backups**
3. **Rotate database credentials regularly**
4. **Enable RLS on all tables**
5. **Use HTTPS only**
6. **Regular security audits**

## Monitoring

Monitor your remote database:

```bash
# Check database size
SELECT pg_size_pretty(pg_database_size('postgres'));

# Check active connections
SELECT * FROM pg_stat_activity;

# Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename))
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Support

For issues:
1. Check logs: `docker-compose logs -f` (self-hosted)
2. Verify migrations ran successfully
3. Check RLS policies are active
4. Ensure API keys are correct
5. Review edge function logs

## Cost Optimization

### Self-Hosted Supabase

- Minimum: 2GB RAM, 2 CPU cores
- Recommended: 4GB RAM, 4 CPU cores
- Storage: Start with 50GB, scale as needed

### Supabase Cloud

- Free tier: Good for testing
- Pro tier: $25/month for production
- Scale as your user base grows
