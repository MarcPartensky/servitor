FROM node:latest

ENV NODE_ENV=production

WORKDIR .
COPY . .
# COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production

CMD ["npm", "start"]
