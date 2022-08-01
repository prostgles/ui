FROM node:16

# Create app directory
WORKDIR /usr/src/app


COPY . .
# Install pg_dump
RUN apt-get update && \
    apt-get upgrade && \
    apt-get -y install postgresql postgresql-client 

WORKDIR /usr/src/app/server
RUN npm i