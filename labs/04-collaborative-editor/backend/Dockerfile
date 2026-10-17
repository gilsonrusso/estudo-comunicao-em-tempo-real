FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3333

ENV HOST=0.0.0.0
ENV PORT=3333

CMD ["node", "dist/server.js"]
