# TechKraft Candidate Dashboard

An internal candidate scoring and review dashboard for TechKraft's recruitment team.

## Setup & Run

```bash
cp .env.example .env
# Generate a strong secret key and update SECRET_KEY in .env
docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |


## Example API Calls

```bash
# Login
curl -X POST http://localhost:8000/auth/login \
  -d "username=admin@techkraft.com&password=Admin1234!" \
  -H "Content-Type: application/x-www-form-urlencoded"

# Register a reviewer
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"reviewer@example.com","password":"pass1234"}'

# List candidates with filters
curl -H "Authorization: Bearer <token>" \
  "http://localhost:8000/candidates?status=new&keyword=python&page=1&page_size=10"

# Submit a score
curl -X POST http://localhost:8000/candidates/<id>/scores \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"category":"Technical","score":4,"note":"Strong fundamentals"}'

# Generate AI summary
curl -X POST http://localhost:8000/candidates/<id>/summary \
  -H "Authorization: Bearer <token>"
```

## Debugging Bug Identification

The provided snippet fetches the entire `candidates` table into memory, then filters and paginates in Python:

```python
all_candidates = db.execute("SELECT * FROM candidates").fetchall()
filtered = [c for c in all_candidates if c["status"] == status]
offset = (page - 1) * page_size
return filtered[offset : offset + page_size]
```

**Why this is wrong:** At scale, loading all rows into memory is O(N) in both time and memory regardless of how selective the filter is. The Python-level pagination slices the already-filtered list — so `total` is never accurate unless all rows are always loaded, making correct page counts impossible without a separate full-table scan. Database indexes on `status` and `role_applied` are completely bypassed.

**Correct approach:** Push all filtering, counting, and pagination into SQL:

```sql
SELECT * FROM candidates
WHERE status = :status AND deleted_at IS NULL
  AND (name LIKE :kw OR email LIKE :kw)
LIMIT :page_size OFFSET :offset;

SELECT COUNT(*) FROM candidates
WHERE status = :status AND deleted_at IS NULL
  AND (name LIKE :kw OR email LIKE :kw);
```

The DB engine uses indexes, only the matching rows are transferred over the wire, and the count query is a separate cheap operation.

## Architecture Decision Records

**ADR-1: SQLite over DynamoDB**
- *Context:* The spec offered "DynamoDB-style or SQLite". DynamoDB requires AWS credentials and running infrastructure, which breaks local Docker Compose portability.
- *Decision:* SQLite with SQLAlchemy async (`aiosqlite`), accessed through the same ORM interface that would work with PostgreSQL.
- *Trade-off:* SQLite does not support horizontal scaling or concurrent writes at high throughput. This is acceptable for a take-home and for this internal-tool use case; swapping to PostgreSQL requires only changing the connection string and driver.

**ADR-2: FastAPI over Flask or Django**
- *Context:* The assignment requires a mock async LLM endpoint (2-second delay) and an SSE streaming endpoint. Both need native `async/await`.
- *Decision:* FastAPI with fully async route handlers, `async_sessionmaker`, and `asyncio.sleep` for the LLM mock.
- *Trade-off:* FastAPI's dependency injection system has a steeper initial learning curve than Flask. The payoff is first-class async support, automatic OpenAPI docs at `/docs`, and Pydantic v2 request/response validation with minimal boilerplate.

**ADR-3: Server-enforced role, no client trust**
- *Context:* RBAC must be spoofing-resistant. A naive implementation would accept `role` from the registration request body.
- *Decision:* The `UserCreate` schema has no `role` field. The registration handler hardcodes `role = "reviewer"`. Admin users are seeded at startup or created directly in the DB.
- *Trade-off:* There is no self-serve admin promotion UI. This is intentional — privilege escalation must be an out-of-band, audited operation, not an API call.

## Learning Reflection

Building the SSE streaming endpoint with FastAPI's `StreamingResponse` was new territory — I had to learn how to properly format `data:` and `\n\n` delimiters so the browser's `EventSource` API parses the events correctly. Given more time, I would replace the mock AI summary with a real streaming LLM call using the Anthropic API, so the summary text streams token by token into the frontend rather than appearing all at once after a fixed delay.

## Known Limitations

- SQLite is not suitable for concurrent production write loads; switch to PostgreSQL for production.
- The SSE endpoint is a mock; it does not subscribe to real DB change events (no pub/sub).
- JWT tokens are not revocable before expiry; a Redis-backed blocklist would be needed for logout invalidation.
