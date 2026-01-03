# Simutu NG - Docker Setup

## Quick Start

### Prerequisites
- Docker and Docker Compose installed

### Setup

1. **Clone or navigate to project directory**
   ```bash
   cd simutu_ng
   ```

2. **Build and start containers**
   ```bash
   docker-compose up -d
   ```

   The first build may take a few minutes as it installs dependencies and builds the Nuxt application.

3. **Access the application**
   - Application: http://localhost:3000
   - PostgreSQL: localhost:5432

### Database Migrations

After the containers are up, run migrations and seed the database:

```bash
# Run migrations
docker-compose exec app npm run db:push

# Seed the database
docker-compose exec app npm run db:seed
```

### Useful Commands

```bash
# View logs
docker-compose logs -f app

# View database logs
docker-compose logs -f db

# Stop containers
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# Rebuild the image
docker-compose build --no-cache

# Execute npm commands in container
docker-compose exec app npm run <command>

# Access PostgreSQL
docker-compose exec db psql -U postgres -d simutu_ng
```

### Environment Variables

Edit `.env.docker` to customize:
- `DB_USER` - PostgreSQL username (default: postgres)
- `DB_PASSWORD` - PostgreSQL password (default: 123456)
- `DB_NAME` - Database name (default: simutu_ng)
- `NODE_ENV` - Environment (production/development)
- `PORT` - Application port (default: 3000)

### Project Structure in Docker

```
simutu_ng_db      - PostgreSQL database service
simutu_ng_app     - Nuxt application service
```

### Troubleshooting

**Port already in use:**
```bash
# Change ports in docker-compose.yml
# Or kill the process using the port
```

**Database connection failed:**
- Wait a few seconds for PostgreSQL to be ready
- Check logs: `docker-compose logs db`

**Application won't start:**
- Check logs: `docker-compose logs app`
- Ensure DATABASE_URL in .env.docker is correct

### Production Deployment

For production, consider:
1. Using environment variables from CI/CD system
2. Setting up proper secrets management
3. Using a reverse proxy (nginx)
4. Enabling HTTPS
5. Setting up proper backup strategy for database
6. Using managed database services (AWS RDS, etc.)

### Development

For development with hot reload:

1. Modify the Dockerfile to use `npm run dev` instead of build
2. Mount source volumes in docker-compose.yml
3. Use docker-compose with additional volumes section

Example development setup in docker-compose.yml:
```yaml
app:
  volumes:
    - .:/app
    - /app/node_modules
```

Then run: `docker-compose up --build`
