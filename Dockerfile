FROM node:latest

ENV NODE_ENV=production

COPY . /app
WORKDIR /app

RUN npm install --production

CMD ["npm", "start"]
