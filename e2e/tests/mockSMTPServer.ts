import { SMTPServer, SMTPServerOptions } from "smtp-server";

export const startMockSMTPServer = () => {
  const emails: string[] = [];
  const getEmails = () => emails;

  const serverOptions: SMTPServerOptions = {
    authMethods: ["PLAIN", "LOGIN", "CRAM-MD5"],
    onAuth(auth, session, callback) {
      // Accept any username/password
      console.log("Auth attempt:", auth.username, auth.password, auth);
      callback(null, { user: auth.username });

      /*
      if (auth.username === 'testuser' && auth.password === 'testpass') {
        callback(null, { user: auth.username });
      } else {
        callback(new Error('Invalid username or password'));
      }
      */
    },
    authOptional: true,
    secure: false,
    onConnect(session, callback) {
      console.log("Client connected:", session.remoteAddress);
      callback();
    },

    // Handler for handling mail from (sender)
    onMailFrom(address, session, callback) {
      console.log("Mail from:", address.address);
      callback();
    },

    // Handler for handling rcpt to (recipient)
    onRcptTo(address, session, callback) {
      console.log("Recipient:", address.address);
      callback();
    },

    // Handler for handling incoming mail data
    onData(stream, session, callback) {
      let mailData = "";

      stream.on("data", (chunk) => {
        mailData += chunk.toString();
      });

      stream.on("end", () => {
        console.log("Received mail:");
        console.log("------------------------");
        console.log(mailData.replaceAll("=3D", "="));
        emails.push(mailData.replaceAll("=3D", "="));
        console.log("------------------------");
        callback();
      });
    },
    onClose(session) {
      console.log("Session closed", session.id);
    },
  };

  const server = new SMTPServer(serverOptions);

  const PORT = 3017;
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`Mock SMTP Server running on port ${PORT}`);
  });

  server.on("error", (err) => {
    console.error("Server error:", err);
  });

  server.on("close", () => {
    console.log("Server closed");
  });

  return {
    getEmails,
  };
};
