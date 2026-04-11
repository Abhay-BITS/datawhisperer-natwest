FROM python:3.11-slim

# Create a non-root user (id 1000) for Hugging Face
RUN useradd -m -u 1000 user

WORKDIR /app

# Install system dependencies (must be done as root)
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy the entire project to preserve directory structure
# (.dockerignore will skip frontend, .git, etc.)
COPY --chown=user . .

# Install dependencies from the backend directory
WORKDIR /app/backend
RUN pip install --no-cache-dir -r requirements.txt

# Hugging Face Spaces expects the app to listen on port 7860
EXPOSE 7860

# Switch to the non-root user for security
USER user

# Start FastAPI with the correct port for Hugging Face
# main.py is in the current WORKDIR (/app/backend)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
