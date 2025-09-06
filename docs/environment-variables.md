# Environment Variables

This document describes the environment variables used in the application.

## Server Configuration

- `SERVER_URL`: The URL of the server. This is used in the OpenAPI specification.
  - Default: `http://localhost:{DEFAULT_PORT}`

## Database Configuration

- `DATABASE_URL`: The URL of the database.
  - Default: `sqlite:///./stock_data.db`

## API Keys

- `YAHOO_FINANCE_API_KEY`: The API key for the Yahoo Finance API.
  - Default: (empty)

## Security

- `ADMIN_TOKEN`: The token required for admin endpoints.
  - Default: (empty)

## CORS (Cross-Origin Resource Sharing)

- `CORS_ORIGINS`: Comma-separated list of allowed origins for CORS.
  - Default: `*` (allows all origins)
  - Example: `http://localhost:3000,https://myapp.com`
- `CORS_ALLOW_CREDENTIALS`: Whether to allow credentials for CORS.
  - Default: `true`
- `CORS_ALLOW_METHODS`: Comma-separated list of allowed methods for CORS.
  - Default: `*` (allows all methods)
  - Example: `GET,POST,PUT,DELETE`
- `CORS_ALLOW_HEADERS`: Comma-separated list of allowed headers for CORS.
  - Default: `*` (allows all headers)
  - Example: `Authorization,Content-Type`

## Logging

- `LOG_LEVEL`: The log level.
  - Default: `INFO`

## Performance

- `USE_REAL_YAHOO_API`: Whether to use the real Yahoo Finance API.
  - Default: `false`

## Development

- `DEBUG`: Whether to enable debug mode.
  - Default: `false`