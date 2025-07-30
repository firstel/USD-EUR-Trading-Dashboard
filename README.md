# USD/EUR Trading Dashboard

FastAPI backend with signal/trade endpoints, and Next.js frontend for visualization. Ready to deploy on Vercel.

## Usage

### Backend

Endpoints:

- \`/api/data\`: hourly timestamps + USD/EUR rates  
- \`/api/signals?strategy=MACD|RSI|MA\`: strategy signals  
- \`/api/trades\`: basic trade stats

### Frontend

Next.js app in \`frontend/`.

## Setup

\`\`\`bash
# Install Python deps
pip install -r requirements.txt

# Setup frontend
cd frontend
npm install
\`\`\`

## Deploy

\`\`\`bash
vercel login
vercel --prod
\`\`\`
