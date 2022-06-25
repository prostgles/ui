# prostgles-server
  
  Isomorphic PostgreSQL client for [node](http://nodejs.org).  
  TypeScript, pg-promise, Socket.IO

[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/prostgles/prostgles-server-js/blob/master/LICENSE)
[![npm version](https://img.shields.io/npm/v/prostgles-server.svg?style=flat)](https://www.npmjs.com/package/prostgles-server)
[![Known Vulnerabilities](https://snyk.io/test/github/prostgles/prostgles-server-js/badge.svg)](https://snyk.io/test/github/prostgles/prostgles-server-js)
![tests](https://github.com/prostgles/prostgles-server-js/workflows/tests/badge.svg?branch=master)



## Features
 
  * CRUD operations 
  * Subscriptions to data changes
  * Policies and Rules for client data access
  * Client-Server data replication
  * Generated TypeScript Definition for Database schema

## Installation

```bash
$ npm install prostgles-server
```

## Quick start

```js
let prostgles = require('prostgles-server');

prostgles({
  dbConnection: {
    host: "localhost",
    port: "5432",
    user: process.env.PG_USER,
    password: process.env.PG_PASS
  },
  onReady: async (dbo) => {
  
    const posts = await dbo.posts.find(
      { title: { $ilike: "%car%" } }, 
      { 
        orderBy: { created: -1 }, 
        limit: 10 
      }
    );
    
  }
});
```

## Server-Client usage

server.js
```js
const express = require('express');
const app = express();
const path = require('path');
var http = require('http').createServer(app);
var io = require('socket.io')(http);
http.listen(3000);

let prostgles = require('prostgles-server');

prostgles({
  dbConnection: {
    host: "localhost",
    port: "5432",
    user: process.env.PRGL_USER,
    password: process.env.PRGL_PWD
  },
  io,
  publish: "*", // Unrestricted INSERT/SELECT/UPDATE/DELETE access to the tables in the database
  onReady: async (dbo) => {
    
  }
});
```

./public/index.html
```html

	  
<!DOCTYPE html>
<html>
	<head>
		<title> Prostgles </title>

		<meta name="viewport" content="width=device-width, initial-scale=1">
		<script src="https://unpkg.com/socket.io-client@latest/dist/socket.io.min.js" type="text/javascript"></script>
		<script src="https://unpkg.com/prostgles-client@latest/dist/index.js" type="text/javascript"></script>	
	</head>
	<body>

		<script>

			prostgles({
				socket: io(), 
				onReady: async ({ db }) => {

				}
			});

		</script>
		
	</body>
</html>


```


## License

  [MIT](LICENSE)
