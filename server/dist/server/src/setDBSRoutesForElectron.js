"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setDBSRoutesForElectron = void 0;
const PubSubManager_1 = require("prostgles-server/dist/PubSubManager/PubSubManager");
const testDBConnection_1 = require("./connectionUtils/testDBConnection");
const validateConnection_1 = require("./connectionUtils/validateConnection");
const electronConfig_1 = require("./electronConfig");
const startProstgles_1 = require("./startProstgles");
const setDBSRoutesForElectron = (app, io, port) => {
    const initState = (0, startProstgles_1.getInitState)();
    if (!initState.isElectron)
        return;
    const ele = (0, electronConfig_1.getElectronConfig)();
    if (!ele?.sidConfig.electronSid) {
        throw "Electron sid missing";
    }
    app.post("/dbs", async (req, res) => {
        const creds = (0, PubSubManager_1.pickKeys)(req.body, ["db_conn", "db_user", "db_pass", "db_host", "db_port", "db_name", "db_ssl", "type"]);
        if (req.body.validate) {
            try {
                const connection = (0, validateConnection_1.validateConnection)(creds);
                res.json({ connection });
            }
            catch (warning) {
                res.json({ warning });
            }
            return;
        }
        if (!creds.db_conn || !creds.db_host) {
            res.json({ warning: "db_conn or db_host Missing" });
            return;
        }
        const sendWarning = (warning, electronConfig) => {
            res.json({ warning });
            electronConfig?.setCredentials(undefined);
        };
        try {
            const electronConfig = (0, electronConfig_1.getElectronConfig)?.();
            try {
                await (0, testDBConnection_1.testDBConnection)(creds);
                const startup = await (0, startProstgles_1.tryStartProstgles)({ app, io, con: creds, port });
                if (!startup.ok) {
                    throw startup;
                }
                electronConfig?.setCredentials(creds);
                res.json({ msg: "DBS changed. Restart system" });
            }
            catch (warning) {
                sendWarning(warning, electronConfig);
            }
        }
        catch (warning) {
            sendWarning(warning);
        }
    });
};
exports.setDBSRoutesForElectron = setDBSRoutesForElectron;
//# sourceMappingURL=setDBSRoutesForElectron.js.map