FROM node:latest

COPY . .
WORKDIR .

RUN npm install

ENTRYPOINT ["npm start"]
