FROM node:20-slim

WORKDIR /app

COPY backend/ ./backend/

RUN cd backend && npm install && npx tsc

EXPOSE 3000

CMD ["node", "backend/dist/index.js"]
