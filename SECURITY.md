# Security Notes

## Public Keys vs Secrets

This project uses several public identifiers that are safe to commit to git:

### ✅ Safe to Commit (Public Identifiers)
- **Giscus IDs**: Public repository and category IDs (meant to be public)
- **Google Analytics ID**: Public tracking ID (meant to be public)
- **Supabase Project URL**: Public project URL (meant to be public)

### ⚠️ Should Use Environment Variables
- **Supabase Anon Key**: While designed to be public (client-side), it's better practice to use environment variables

## Setup Instructions

1. **Local Development**:
   ```bash
   cp .env.example .env
   # Edit .env and add your SUPABASE_ANON_KEY
   ```

2. **GitHub Actions**:
   - Go to Repository Settings > Secrets and variables > Actions
   - Add a secret named `SUPABASE_ANON_KEY` with your anon key value
   - The workflow will automatically use it during builds

## Getting Your Supabase Anon Key

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Project Settings** > **API**
4. Copy the `anon` / `public` key

## Note

The Supabase anon key will still appear in the generated HTML files (it needs to be client-side). Using environment variables prevents committing it to git and allows different keys for dev/prod environments.
