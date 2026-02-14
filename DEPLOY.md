# Dispersion Lab — Deployment Guide

## Prerequisites

- [Supabase](https://supabase.com) project (free tier works)
- [Vercel](https://vercel.com) account (free tier works)
- Node.js 18+

## 1. Supabase Setup

1. Create a new Supabase project
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Go to **Authentication > Settings**:
   - Enable "Email" provider
   - Disable "Email Confirmations" for easier dev testing (optional)
4. Copy your project URL and anon key from **Settings > API**

## 2. Local Development

```bash
# Clone and install
npm install

# Create .env.local from example
cp .env.local.example .env.local
# Edit .env.local with your Supabase URL and anon key

# Run dev server
npm run dev
```

## 3. Vercel Deployment

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. Import the project on [vercel.com](https://vercel.com)
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — your Supabase anon/public key
4. Deploy

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (e.g., `https://xyz.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |

## Features

- **Import**: Upload Garmin R50 CSV files
- **Dispersion Charts**: D3-based scatter plots with 1σ/2σ ellipses
- **Shot Editing**: Inline + bulk edit (target, full/partial, tags)
- **Compare**: Multi-session overlay, rolling averages, normalized distances
- **Yardage Card**: Configurable card with P20–P80 ranges, PDF/PNG export
- **Environment Modeling**: Air density calculations, normalize/simulate modes
- **Calculator**: Plays-like yardage based on conditions
- **Recommendations**: Handicap-aware improvement suggestions with practice plans
