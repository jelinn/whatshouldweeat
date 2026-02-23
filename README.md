# WhatShouldWeEat

A personal recipe storage and meal planning application with AI-powered recommendations.

## Features

- **Recipe Storage** - Save recipes via manual entry, URL import, or copy-paste
- **Smart Import** - Automatically extract recipes from food blog URLs
- **AI Discovery** - Get personalized recommendations and generate new recipes
- **Weekly Meal Planner** - Plan your meals with a drag-and-drop calendar
- **Grocery Lists** - Auto-generate shopping lists from your meal plan
- **Persistent Staples** - Keep track of items you always need

## Tech Stack

- **Frontend**: Next.js 14+ with App Router
- **Database**: SQLite with Drizzle ORM
- **Styling**: Tailwind CSS + shadcn/ui
- **AI**: Flexible LLM providers (Claude, OpenAI, Ollama)

## Quick Start

### Development

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/whatshouldweeat.git
   cd whatshouldweeat
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```

4. Edit `.env.local` and add your API key:
   ```
   ANTHROPIC_API_KEY=your-api-key-here
   ```

5. Initialize the database:
   ```bash
   npm run db:push
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000)

### Docker Deployment

1. Create your environment file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your settings:
   ```
   ANTHROPIC_API_KEY=your-api-key-here
   LLM_PROVIDER=claude
   ```

3. Build and start with Docker Compose:
   ```bash
   docker compose up -d
   ```

4. Access the app at [http://localhost:3000](http://localhost:3000)

#### Docker Commands

```bash
# Build the image
docker compose build

# Start the container
docker compose up -d

# View logs
docker compose logs -f

# Stop the container
docker compose down

# Rebuild after code changes
docker compose up -d --build
```

## Configuration

### LLM Providers

WhatShouldWeEat supports multiple LLM providers for AI features:

#### Claude (Anthropic)
```env
LLM_PROVIDER=claude
ANTHROPIC_API_KEY=your-api-key
```

#### OpenAI
```env
LLM_PROVIDER=openai
OPENAI_API_KEY=your-api-key
```

#### Ollama (Local)
```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
LLM_MODEL=llama3.2
```

## Database Backup & Restore

The SQLite database is stored in `./data/recipes.db`.

### Manual Backup

```bash
# Create a backup
./scripts/backup.sh

# Create a backup to custom location
./scripts/backup.sh /path/to/backups
```

### Restore

```bash
# Interactive restore (choose from list)
./scripts/restore.sh

# Restore specific backup
./scripts/restore.sh backups/recipes_20240115_120000.db
```

### Docker Backups

When running in Docker, the data directory is mounted as a volume. To backup:

```bash
# Backup the database
docker compose exec app cat /app/data/recipes.db > backup.db

# Or use the backup script
./scripts/backup.sh
```

## Project Structure

```
whatshouldweeat/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   ├── recipes/           # Recipe pages
│   │   ├── discover/          # AI discovery page
│   │   ├── planner/           # Meal planner
│   │   └── grocery/           # Grocery list
│   ├── components/            # React components
│   │   └── ui/               # shadcn/ui components
│   └── lib/
│       ├── ai/               # LLM provider abstraction
│       ├── db/               # Database schema & connection
│       ├── services/         # Business logic
│       └── utils/            # Utility functions
├── data/                      # SQLite database (gitignored)
├── scripts/                   # Backup/restore scripts
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

## API Reference

### Recipes

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/recipes` | List all recipes |
| POST | `/api/recipes` | Create a recipe |
| GET | `/api/recipes/[id]` | Get recipe by ID |
| PATCH | `/api/recipes/[id]` | Update recipe |
| DELETE | `/api/recipes/[id]` | Delete recipe |
| POST | `/api/recipes/import` | Import from URL or text |

### Meal Planner

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/planner?weekStart=YYYY-MM-DD` | Get week's meal plan |
| POST | `/api/planner` | Add meal to plan |
| DELETE | `/api/planner/[id]` | Remove meal from plan |
| POST | `/api/planner/quick-fill` | Auto-fill with recipes |
| POST | `/api/planner/copy-week` | Copy from previous week |

### Grocery

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/grocery?weekStart=YYYY-MM-DD` | Get grocery list |
| PATCH | `/api/grocery/[id]` | Toggle item checked |
| POST | `/api/grocery/clear` | Clear completed items |

### AI Features

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/ai/recommend` | Get recipe recommendations |
| POST | `/api/ai/generate` | Generate a new recipe |

## Development

### Database Migrations

```bash
# Generate migration from schema changes
npm run db:generate

# Apply migrations
npm run db:push

# Open Drizzle Studio (database GUI)
npm run db:studio
```

### Adding shadcn/ui Components

```bash
npx shadcn@latest add [component-name]
```

## License

MIT
