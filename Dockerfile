
FROM node:16

# Create app directory
WORKDIR /usr/src/app


COPY . .

WORKDIR /usr/src/app/client


WORKDIR /usr/src/app/server
RUN npm run build



