# Security Notes

## Public Identifiers

This project uses public client-side identifiers that are safe to commit to git:

- **Giscus IDs**: Public repository and category IDs (meant to be public)
- **Google Analytics ID**: Public tracking ID (meant to be public)

## Optional Build Environment Variables

- `SITE_BASE`: Optional canonical site base URL (defaults to `https://reubenpeterpaul.com`). Copy `.env.example` to `.env` if you want to override it locally.
