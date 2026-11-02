import { SMTPServer, SMTPServerOptions } from "smtp-server";

export const startMockSMTPServer = async ({
  port = 3017,
  disabledCommands,
  onEmail,
}: {
  port?: number;
  disabledCommands?: SMTPServerOptions["disabledCommands"];
  onEmail?: (
    email: { recipient: string; message: string },
    callback: (error?: Error) => void,
  ) => void;
} = {}) => {
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
    disabledCommands,
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
        if (onEmail) {
          const [recipient] = session.envelope.rcptTo;
          onEmail(
            { recipient: recipient?.address ?? "", message: mailData },
            callback,
          );
          return;
        }
        console.log("Received mail:");
        console.log("------------------------");
        console.log(mailData.replaceAll("=3D", "="));
        emails.push(mailData.replace(/=\r?\n/g, "").replaceAll("=3D", "="));
        console.log("------------------------");
        callback();
      });
    },
    onClose(session) {
      console.log("Session closed", session.id);
    },
  };

  const server = new SMTPServer(serverOptions);

  server.on("error", (err) => {
    console.error("Server error:", err);
  });

  server.on("close", () => {
    console.log("Server closed");
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.removeListener("error", reject);
      resolve();
    });
  });
  const address = server.server.address();
  if (!address || typeof address === "string") {
    throw new Error("SMTP port missing");
  }
  console.log(`Mock SMTP Server running on port ${address.port}`);

  return {
    getEmails,
    getLatestCode: () => {
      const code = emails.at(-1)?.match(/[?&]code=(\d{6})\b/)?.[1];
      if (!code) throw new Error("Confirmation code missing from latest email");
      return code;
    },
    port: address.port,
    close: () => new Promise<void>((resolve) => server.close(resolve)),
  };
};
