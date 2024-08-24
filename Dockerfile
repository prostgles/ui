FROM node:20

# Create app directory
WORKDIR /usr/src/app


COPY . .
# Install latest pg_dump  (psql v16)
RUN apt-get update && \
    apt-get install -y lsb-release && apt-get clean all && \
    apt-get upgrade -y && \
    sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'  && \
    wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add - && \
    apt-get -y update && \
    apt-get -y install postgresql-16

WORKDIR /usr/src/app

RUN ./prod-start.sh