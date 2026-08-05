FROM node:22-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY backend.py ./
COPY --from=frontend /app/dist ./dist
EXPOSE 8080
CMD ["uvicorn", "backend:app", "--host", "0.0.0.0", "--port", "8080"]
