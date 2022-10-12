"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionChecker = exports.ADMIN_ACCESS_WITHOUT_PASSWORD = exports.EMPTY_PASSWORD = exports.EMPTY_USERNAME = void 0;
const index_1 = require("./index");
/** Required to enable API access */
const cors_1 = __importDefault(require("cors"));
exports.EMPTY_USERNAME = "prostgles-no-auth-user", exports.EMPTY_PASSWORD = "prostgles";
const ADMIN_ACCESS_WITHOUT_PASSWORD = async (db) => {
    if (!index_1.PRGL_USERNAME || !index_1.PRGL_PASSWORD) {
        if (await db.users.count({ username: exports.EMPTY_USERNAME, status: "active" })) {
            return true;
        }
    }
    return false;
};
exports.ADMIN_ACCESS_WITHOUT_PASSWORD = ADMIN_ACCESS_WITHOUT_PASSWORD;
class ConnectionChecker {
    app;
    configLoaded = false;
    constructor(app) {
        this.app = app;
        app.use((0, cors_1.default)(this.withOrigin));
        app.use(async (req, res, next) => {
            if (!this.configLoaded) {
                res.status(503).json("Server not ready. Retry in few seconds");
                return;
            }
            const c = await this.checkClientIP({ req });
            if (!c.isAllowed) {
                res.status(403).json({ error: "Your IP is not allowed" });
                return;
            }
            next();
        });
    }
    hasNoPWD;
    corsValue;
    trustProxy = false;
    // ipRanges: IPRange[] = [];
    db;
    configSub;
    init = async (db) => {
        this.db = db;
        if (!this.configSub) {
            this.hasNoPWD = await (0, exports.ADMIN_ACCESS_WITHOUT_PASSWORD)(db);
            /** Add cors config if missing */
            const confCount = await db.global_settings.count();
            if (+confCount <= 0) {
                await db.global_settings.insert({
                    allowed_origin: this.hasNoPWD ? null : "*",
                    allowed_ips: ["::ffff:127.0.0.1"]
                });
            }
            this.configSub = await db.global_settings.subscribeOne({}, {}, async (gconfigs) => {
                this.configLoaded = true;
                this.corsValue = gconfigs.allowed_origin || undefined;
                this.trustProxy = gconfigs.trust_proxy;
                this.app.set("trust proxy", this.trustProxy);
                // const cidrRequests = (gconfigs.allowed_ips ?? []).map(cidr => 
                //   db.sql!(
                //     getCIDRRangesQuery({ cidr, returns: ["from", "to"]  }),
                //     { cidr },
                //     { returnType: "row" }
                //   )
                // ) as any
                // this.ipRanges = await Promise.all(cidrRequests);
            });
        }
    };
    /**
     * This is mainly used to ensure that when there is passwordless admin login external IPs cannot connect
     */
    checkClientIP = async (args) => {
        const ip = "req" in args ? args.req.ip : args.socket?.conn?.remoteAddress;
        const isAllowed = await (args.dbsTX || this.db)?.sql("SELECT inet ${ip} <<= any (allowed_ips::inet[]) FROM global_settings ", { ip }, { returnType: "value" });
        return {
            ip,
            isAllowed //: (args.byPassedRanges || this.ipRanges).some(({ from, to }) => ip && ip >= from && ip <= to )
        };
    };
    withOrigin = {
        origin: (origin, cb) => {
            cb(null, this.corsValue);
        }
    };
}
exports.ConnectionChecker = ConnectionChecker;
//# sourceMappingURL=ConnectionChecker.js.map