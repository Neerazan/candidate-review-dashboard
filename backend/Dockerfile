FROM python:3.13-slim

WORKDIR /app

# install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# copy dependency files first
COPY pyproject.toml uv.lock ./

# install dependencies
RUN uv sync --frozen

# copy source
COPY . .

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
