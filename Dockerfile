
FROM node:16

# Create app directory
WORKDIR /usr/src/app


COPY . .

# Install pg_dump
RUN apk update &&     apk upgrade &&     apk add postgresql>13 &&     apk add postgresql-client>13

WORKDIR /usr/src/app/client


WORKDIR /usr/src/app/server
RUN npm i



