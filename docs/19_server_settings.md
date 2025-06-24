<h1 id="server_settings"> Server Settings </h1> 

Manage server settings to enhance security, configure authentication methods, and set up LLM providers.
<picture>
<source srcset="./screenshots/dark/server_settings.svg" media="(prefers-color-scheme: dark)">
<img src="./screenshots/server_settings.svg" alt="Server Settings" style="border: 1px solid; margin: 1em 0;" />
</picture>

- **Security**: Security. Configure domain access, IP restrictions, session duration, and login rate limits to enhance security.  
  - **Server settings**: Configure server settings.  
- **Authentication**: Manage user authentication methods, default user roles, and third-party login providers to control access.  
  - **Website URL**: Website URL. Used for email and third-party login redirect URL. When first visiting the app as an admin user, it is automatically set to the current URL which will trigger a page refresh.  
  - **Default user type**: The default user type assigned to new users. Defaults to 'default'.  
  - <a href="#email_signup">Email signup</a>: Email signup/magic-link authentication setup.  
  - **Third-party login providers**: Third-party login providers (OAuth2)  
- **MCP Servers**: Manage MCP servers and tools that can then be used in the Ask AI chat  
- **LLM Providers**: Manage LLM providers, credentials and models to be used in the Ask AI chat  

<h3 id="email_signup"> Email signup </h3> 

Provide SMTP or AWS SES credentials to enable email signup and magic-link authentication. 
By default users authenticate using a password.

  - **Enable/Disable email signup toggle**: Enable email signup. This will allow users to sign up and log in using their email address.  
  - **Signup type**: Signup type. Choose between 'withPassword' or 'withMagicLink'.  
  - **Email verification**: SMTP and email template setup.  
    - **Email provider setup**: SMTP settings for sending registration/magic-link emails. Allowed providers: SMTP (host, port, username, password) or AWS SES (region, accessKeyId, secretAccessKey).  
    - **Email Template setup**: Email template for registration/magic-link emails  
    - **Test and save**: Test and Save SMTP and email template settings.  

