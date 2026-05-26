<h1 id="api"> API </h1> 

The API section allows you to configure the API access settings for your application.
This enables programmatic access to your application's data and functionality via HTTP or WebSocket protocols.
Generated database types can be used to interact with the API in a type-safe manner through our TypeScript client library.
Code snippets are provided to help you get started with using the API in your applications.
You can also manage API tokens for authentication and access control.

You can set the URL path for the API, manage allowed origins for CORS requests, and create or view API tokens for accessing the API. The API supports both WebSocket and HTTP protocols.

  - **API URL Path**: Set the URL path for the API. This is the base path for all API endpoints.  
  - **Allowed Origin Alert**: Will only appear if the allowed origin is not set.  
    - **Allowed Origin**: Set the allowed origin for CORS requests. This controls which domains can make cross-origin requests to this app by setting the Access-Control-Allow-Origin header.  
  - **Websocket API usage examples**: View examples of how to use the API using typescript and javascript  
  - **HTTP API usage examples**: View examples of how to use the API using typescript and javascript  
  - **API Tokens**: Shows existing API tokens and allows you to create new ones.  
    - **Create API Token**: Create a new API token for accessing the API. Tokens can be used for both WebSocket and HTTP API access.  
      - **Expires in (days)**: Set the number of days until the token expires. After expiration, the token will no longer be valid.  
      - **Generate Token**: Click to generate a new API token. The token will be displayed once generated. After generation, the code examples will be updated to include the new token.  

