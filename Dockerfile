FROM node:20-slim

WORKDIR /app

COPY backend/package*.json ./backend/
RUN cd backend && npm install

COPY backend/ ./backend/

RUN cd backend && npx tsc

EXPOSE 3000

CMD ["node", "backend/dist/index.js"]
