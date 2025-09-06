# Architecture

This document explains the architecture of StockVision.

## Overview

StockVision is a full-stack application composed of a frontend (React) and a backend (FastAPI).

## Frontend

The frontend is built with React and TypeScript.

### Key Technologies

- React 18
- TypeScript
- Tailwind CSS
- React Router
- Axios
- Chart.js

### Directory Structure

```
src/
├── components/     # UI Components
├── contexts/      # React Context
├── hooks/         # Custom Hooks
├── pages/         # Page Components
├── services/      # API Services
├── types/         # TypeScript Type Definitions
├── utils/         # Utility Functions
└── ...
```

## Backend

The backend is built with FastAPI and Python.

### Key Technologies

- FastAPI
- Python 3.12
- SQLAlchemy
- SQLite
- Pydantic
- Uvicorn

### Directory Structure

```
src/
├── api/           # API Endpoints
├── models/        # Database Models
├── services/      # Business Logic
├── utils/         # Utility Functions
├── middleware/    # Middleware
└── ...
```

## Database

SQLite is used.