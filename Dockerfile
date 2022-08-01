FROM node:16

# Create app directory
WORKDIR /usr/src/app


COPY . .
# Install pg_dump
RUN apt-get update && \
    apt-get upgrade && \
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - && \
    apt-get update && \
    apt-get -y upgrade && \
    apt-get -y install postgresql

WORKDIR /usr/src/app/server
RUN npm i