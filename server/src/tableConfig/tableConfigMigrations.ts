import type { TableConfigMigrations } from "prostgles-server/dist/ProstglesTypes";

export const tableConfigMigrations = {
  silentFail: false,
  version: 5,
  onMigrate: async ({ db, oldVersion }) => {
    console.warn("Migrating from version: ", oldVersion);
    if (oldVersion === 3) {
      await db.any(` 
              UPDATE login_attempts 
                SET ip_address_remote = COALESCE(ip_address_remote, ''),
                  user_agent = COALESCE(user_agent, ''),
                  x_real_ip = COALESCE(x_real_ip, '')
              WHERE ip_address_remote IS NULL 
              OR user_agent IS NULL 
              OR x_real_ip IS NULL
            `);
    } else if (oldVersion === 4) {
      await db.any(` 
              UPDATE llm_messages
              SET message = jsonb_build_array(jsonb_build_object('type', 'text', 'text', message)) 
              WHERE message IS NOT NULL
            `);
    }
  },
} satisfies TableConfigMigrations;
