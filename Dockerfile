FROM node:16

# Create app directory
WORKDIR /usr/src/app


COPY . .
# Install pg_dump
RUN apt-get update && \
    apt-get upgrade && \
    apt-get install postgresql postgresql-client -Y

WORKDIR /usr/src/app/client
RUN npm i && rm -rf ./src


WORKDIR /usr/src/app/server
RUN npm i
# RUN npm run build
# RUN npm start


# WORKDIR /usr/src/app
# RUN /usr/src/app/start.sh

# EXPOSE 3004
# CMD [ "npm", "start" ]