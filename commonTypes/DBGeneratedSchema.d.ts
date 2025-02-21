/* Schema definition generated prostgles-server */

export type DBGeneratedSchema = {
  access_control: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      created?: null | string;
      database_id: number;
      dbPermissions: 
       |  {  type: 'Run SQL';  allowSQL?: boolean; }
       |  {  type: 'All views/tables';  allowAllTables: ("select" | "insert" | "update" | "delete")[]; }
       |  {  type: 'Custom';  customTables: (  {  tableName: string;  select?: | boolean |  {  fields: | string[] | '*' | '' |  Record<string, 1 | true> |  Record<string, 0 | false>;  forcedFilterDetailed?: any;  subscribe?: {  throttle?: number; };  filterFields?: | string[] | '*' | '' |  Record<string, 1 | true> |  Record<string, 0 | false>;  orderByFields?: | string[] | '*' | '' |  Record<string, 1 | true> |  Record<string, 0 | false>; };  update?: | boolean |  {  fields: | string[] | '*' | '' |  Record<string, 1 | true> |  Record<string, 0 | false>;  forcedFilterDetailed?: any;  checkFilterDetailed?: any;  filterFields?: | string[] | '*' | '' |  Record<string, 1 | true> |  Record<string, 0 | false>;  orderByFields?: | string[] | '*' | '' |  Record<string, 1 | true> |  Record<string, 0 | false>;  forcedDataDetail?: any[];  dynamicFields?: (  {  filterDetailed: any;  fields: | string[] | '*' | '' |  Record<string, 1 | true> |  Record<string, 0 | false>; } )[]; };  insert?: | boolean |  {  fields: | string[] | '*' | '' |  Record<string, 1 | true> |  Record<string, 0 | false>;  forcedDataDetail?: any[];  checkFilterDetailed?: any; };  delete?: | boolean |  {  filterFields: | string[] | '*' | '' |  Record<string, 1 | true> |  Record<string, 0 | false>;  forcedFilterDetailed?: any; };  sync?: {  id_fields: string[];  synced_field: string;  throttle?: number;  allow_delete?: boolean; }; } )[]; }
      dbsPermissions?: null | {    createWorkspaces?: boolean;   viewPublishedWorkspaces?: {  workspaceIds: string[]; };  };
      id?: number;
      llm_daily_limit?: number;
      name?: null | string;
    };
  };
  access_control_allowed_llm: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      access_control_id: number;
      llm_credential_id: number;
      llm_prompt_id: number;
    };
  };
  access_control_connections: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      access_control_id: number;
      connection_id: string;
    };
  };
  access_control_methods: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      access_control_id: number;
      published_method_id: number;
    };
  };
  access_control_user_types: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      access_control_id: number;
      user_type: string;
    };
  };
  alert_viewed_by: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      alert_id?: null | string;
      id?: string;
      user_id?: null | string;
      viewed?: null | string;
    };
  };
  alerts: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      connection_id?: null | string;
      created?: null | string;
      data?: null | any;
      database_config_id?: null | number;
      id?: string;
      message?: null | string;
      section?: null | "access_control" | "backups" | "table_config" | "details" | "status" | "methods" | "file_storage" | "API"
      severity: "info" | "warning" | "error"
      title?: null | string;
    };
  };
  backups: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      connection_details?: string;
      connection_id?: null | string;
      content_type?: string;
      created?: string;
      credential_id?: null | number;
      dbSizeInBytes: string;
      destination: "Local" | "Cloud" | "None (temp stream)"
      details?: null | any;
      dump_command: string;
      dump_logs?: null | string;
      id?: string;
      initiator?: null | string;
      last_updated?: string;
      local_filepath?: null | string;
      options: 
       |  {  command: 'pg_dumpall';  clean: boolean;  dataOnly?: boolean;  globalsOnly?: boolean;  rolesOnly?: boolean;  schemaOnly?: boolean;  ifExists?: boolean;  encoding?: string;  keepLogs?: boolean; }
       |  {  command: 'pg_dump';  format: 'p' | 't' | 'c';  dataOnly?: boolean;  clean?: boolean;  create?: boolean;  encoding?: string;  numberOfJobs?: number;  noOwner?: boolean;  compressionLevel?: number;  ifExists?: boolean;  keepLogs?: boolean;  excludeSchema?: string;  schemaOnly?: boolean; }
      restore_command?: null | string;
      restore_end?: null | string;
      restore_logs?: null | string;
      restore_options?: {    command: 'pg_restore' | 'psql';   format: 'p' | 't' | 'c';   clean: boolean;   excludeSchema?: string;   newDbName?: string;   create?: boolean;   dataOnly?: boolean;   noOwner?: boolean;   numberOfJobs?: number;   ifExists?: boolean;   keepLogs?: boolean;  };
      restore_start?: null | string;
      restore_status?: 
       | null
       |  {  ok: string; }
       |  {  err: string; }
       |  {  loading: {  loaded: number;  total: number; }; }
      sizeInBytes?: null | string;
      status: 
       |  {  ok: string; }
       |  {  err: string; }
       |  {  loading?: {  loaded: number;  total?: number; }; }
      uploaded?: null | string;
    };
  };
  connections: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      config?: null | {    enabled: boolean;   path: string;  };
      created?: null | string;
      db_conn?: null | string;
      db_connection_timeout?: null | number;
      db_host?: string;
      db_name: string;
      db_pass?: null | string;
      db_port?: number;
      db_schema_filter?: 
       | null
       |  Record<string, 1>
       |  Record<string, 0>
      db_ssl?: "disable" | "allow" | "prefer" | "require" | "verify-ca" | "verify-full"
      db_user?: string;
      db_watch_shema?: null | boolean;
      disable_realtime?: null | boolean;
      id?: string;
      info?: null | {    canCreateDb?: boolean;  };
      is_state_db?: null | boolean;
      last_updated?: string;
      name: string;
      on_mount_ts?: null | string;
      on_mount_ts_disabled?: null | boolean;
      prgl_params?: null | any;
      prgl_url?: null | string;
      ssl_certificate?: null | string;
      ssl_client_certificate?: null | string;
      ssl_client_certificate_key?: null | string;
      ssl_reject_unauthorized?: null | boolean;
      table_options?: null | Partial<Record<string,  {  icon?: string; }>>
      type: "Standard" | "Connection URI" | "Prostgles"
      url_path?: null | string;
      user_id?: null | string;
    };
  };
  credential_types: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      id: string;
    };
  };
  credentials: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      bucket?: null | string;
      id?: number;
      key_id: string;
      key_secret: string;
      name?: string;
      region?: null | string;
      type?: string;
      user_id?: null | string;
    };
  };
  database_config_logs: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      id?: number;
      on_mount_logs?: null | string;
      on_run_logs?: null | string;
      table_config_logs?: null | string;
    };
  };
  database_configs: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      backups_config?: null | {    enabled?: boolean;   cloudConfig: null |  {  credential_id?: null | number; };   frequency: 'daily' | 'monthly' | 'weekly' | 'hourly';   hour?: number;   dayOfWeek?: number;   dayOfMonth?: number;   keepLast?: number;   err?: null | string;   dump_options: |  {  command: 'pg_dumpall';  clean: boolean;  dataOnly?: boolean;  globalsOnly?: boolean;  rolesOnly?: boolean;  schemaOnly?: boolean;  ifExists?: boolean;  encoding?: string;  keepLogs?: boolean; }
 |  {  command: 'pg_dump';  format: 'p' | 't' | 'c';  dataOnly?: boolean;  clean?: boolean;  create?: boolean;  encoding?: string;  numberOfJobs?: number;  noOwner?: boolean;  compressionLevel?: number;  ifExists?: boolean;  keepLogs?: boolean;  excludeSchema?: string;  schemaOnly?: boolean; };  };
      db_host: string;
      db_name: string;
      db_port: number;
      file_table_config?: null | {    fileTable?: string;   storageType: |  {  type: 'local'; }
 |  {  type: 'S3';  credential_id: number; };   referencedTables?: any;   delayedDelete?: {  deleteAfterNDays: number;  checkIntervalHours?: number; };  };
      id?: number;
      rest_api_enabled?: null | boolean;
      sync_users?: null | boolean;
      table_config?: null | Record<string, 
 |  {  isLookupTable: {  values: Record<string, string>; }; }
 |  {  columns: Record<string,  | string |  {  hint?: string;  nullable?: boolean;  isText?: boolean;  trimmed?: boolean;  defaultValue?: any; } |  {  jsonbSchema: |  {  type: 'string' | 'number' | 'boolean' | 'Date' | 'time' | 'timestamp' | 'string[]' | 'number[]' | 'boolean[]' | 'Date[]' | 'time[]' | 'timestamp[]';  optional?: boolean;  description?: string; } |  {  type: 'Lookup' | 'Lookup[]';  optional?: boolean;  description?: string; } |  {  type: 'object';  optional?: boolean;  description?: string; }; }>; }>
      table_config_ts?: null | string;
      table_config_ts_disabled?: null | boolean;
    };
  };
  database_stats: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      database_config_id?: null | number;
    };
  };
  global_settings: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      allowed_ips?: string[];
      allowed_ips_enabled?: boolean;
      allowed_origin?: null | string;
      auth_providers?: null | {    website_url: string;   created_user_type?: string;   email?: |  {  signupType: 'withMagicLink';  enabled?: boolean;  smtp: |  {  type: 'smtp';  host: string;  port: number;  secure?: boolean;  rejectUnauthorized?: boolean;  user: string;  pass: string; } |  {  type: 'aws-ses';  region: string;  accessKeyId: string;  secretAccessKey: string;  sendingRate?: number; };  emailTemplate: {  from: string;  subject: string;  body: string; };  emailConfirmationEnabled?: boolean; }
 |  {  signupType: 'withPassword';  enabled?: boolean;  minPasswordLength?: number;  smtp: |  {  type: 'smtp';  host: string;  port: number;  secure?: boolean;  rejectUnauthorized?: boolean;  user: string;  pass: string; } |  {  type: 'aws-ses';  region: string;  accessKeyId: string;  secretAccessKey: string;  sendingRate?: number; };  emailTemplate: {  from: string;  subject: string;  body: string; };  emailConfirmationEnabled?: boolean; };   google?: {  enabled?: boolean;  clientID: string;  clientSecret: string;  authOpts?: {  scope: ("profile" | "email" | "calendar" | "calendar.readonly" | "calendar.events" | "calendar.events.readonly")[]; }; };   github?: {  enabled?: boolean;  clientID: string;  clientSecret: string;  authOpts?: {  scope: ("read:user" | "user:email")[]; }; };   microsoft?: {  enabled?: boolean;  clientID: string;  clientSecret: string;  authOpts?: {  prompt: 'login' | 'none' | 'consent' | 'select_account' | 'create';  scope: ("openid" | "profile" | "email" | "offline_access" | "User.Read" | "User.ReadBasic.All" | "User.Read.All")[]; }; };   facebook?: {  enabled?: boolean;  clientID: string;  clientSecret: string;  authOpts?: {  scope: ("email" | "public_profile" | "user_birthday" | "user_friends" | "user_gender" | "user_hometown")[]; }; };   customOAuth?: {  enabled?: boolean;  clientID: string;  clientSecret: string;  displayName: string;  displayIconPath?: string;  authorizationURL: string;  tokenURL: string;  authOpts?: {  scope: string[]; }; };  };
      enable_logs?: boolean;
      id?: number;
      login_rate_limit?: {    maxAttemptsPerHour: number;   groupBy: 'x-real-ip' | 'remote_ip' | 'ip';  };
      login_rate_limit_enabled?: boolean;
      magic_link_validity_days?: number;
      pass_process_env_vars_to_server_side_functions?: boolean;
      prostgles_registration?: null | {    enabled: boolean;   email: string;   token: string;  };
      session_max_age_days?: number;
      tableConfig?: null | any;
      trust_proxy?: boolean;
      updated_at?: string;
      updated_by?: "user" | "app"
    };
  };
  links: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      closed?: null | boolean;
      created?: null | string;
      deleted?: null | boolean;
      disabled?: null | boolean;
      id?: string;
      last_updated: string;
      options: 
       |  {  type: 'table';  colorArr?: number[];  tablePath: (  {  table: string;  on: (  Record<string, any> )[]; } )[]; }
       |  {  type: 'map';  dataSource?: |  {  type: 'sql';  sql: string;  withStatement: string; } |  {  type: 'table';  joinPath?: (  {  table: string;  on: (  Record<string, any> )[]; } )[]; } |  {  type: 'local-table';  localTableName: string;  smartGroupFilter?: |  {  $and: any[]; } |  {  $or: any[]; }; };  smartGroupFilter?: |  {  $and: any[]; } |  {  $or: any[]; };  joinPath?: (  {  table: string;  on: (  Record<string, any> )[]; } )[];  localTableName?: string;  sql?: string;  osmLayerQuery?: string;  mapIcons?: |  {  type: 'fixed';  iconPath: string; } |  {  type: 'conditional';  columnName: string;  conditions: (  {  value: any;  iconPath: string; } )[]; };  mapColorMode?: |  {  type: 'fixed';  colorArr: number[]; } |  {  type: 'scale';  columnName: string;  min: number;  max: number;  minColorArr: number[];  maxColorArr: number[]; } |  {  type: 'conditional';  columnName: string;  conditions: (  {  value: any;  colorArr: number[]; } )[]; };  mapShowText?: {  columnName: string; };  columns: (  {  name: string;  colorArr: number[]; } )[]; }
       |  {  type: 'timechart';  dataSource?: |  {  type: 'sql';  sql: string;  withStatement: string; } |  {  type: 'table';  joinPath?: (  {  table: string;  on: (  Record<string, any> )[]; } )[]; } |  {  type: 'local-table';  localTableName: string;  smartGroupFilter?: |  {  $and: any[]; } |  {  $or: any[]; }; };  smartGroupFilter?: |  {  $and: any[]; } |  {  $or: any[]; };  joinPath?: (  {  table: string;  on: (  Record<string, any> )[]; } )[];  localTableName?: string;  sql?: string;  groupByColumn?: string;  otherColumns?: (  {  name: string;  label?: string;  udt_name: string; } )[];  columns: (  {  name: string;  colorArr: number[];  statType?: {  funcName: '$min' | '$max' | '$countAll' | '$avg' | '$sum';  numericColumn: string; }; } )[]; }
      user_id: string;
      w1_id: string;
      w2_id: string;
      workspace_id?: null | string;
    };
  };
  llm_chats: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      created?: null | string;
      disabled_message?: null | string;
      disabled_until?: null | string;
      id?: number;
      llm_credential_id?: null | number;
      llm_prompt_id?: null | number;
      name?: string;
      user_id: string;
    };
  };
  llm_chats_allowed_functions: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      chat_id: number;
      server_function_id: number;
    };
  };
  llm_credentials: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      config?: 
       |  {  Provider: 'OpenAI';  API_Key: string;  model: string;  temperature?: number;  frequency_penalty?: number;  max_completion_tokens?: number;  presence_penalty?: number;  response_format?: 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt'; }
       |  {  Provider: 'Anthropic';  API_Key: string;  "anthropic-version": string;  model: string;  max_tokens: number; }
       |  {  Provider: 'Custom';  headers?: Record<string, string>;  body?: Record<string, string>; }
       |  {  Provider: 'Prostgles';  API_Key: string; }
       |  {  Provider: 'Google'; }
      created?: null | string;
      endpoint?: string;
      id?: number;
      is_default?: null | boolean;
      name?: string;
      result_path?: null | string[];
      user_id: string;
    };
  };
  llm_messages: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      chat_id: number;
      created?: null | string;
      id?: string;
      message: 
       |  ( 
 |  {  type: 'text';  text: string; }
 |  {  type: 'image';  source: {  type: 'base64';  media_type: string;  data: string; }; }
 |  {  type: 'tool_result';  tool_use_id: string;  content: string;  is_error?: boolean; }
 |  {  type: 'tool_use';  id: string;  name: string;  input: any; } )[]
      user_id?: null | string;
    };
  };
  llm_prompts: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      created?: null | string;
      description?: null | string;
      id?: number;
      name?: string;
      prompt: string;
      user_id?: null | string;
    };
  };
  login_attempts: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      auth_provider?: null | string;
      auth_type: "session-id" | "registration" | "email-confirmation" | "magic-link-registration" | "magic-link" | "otp-code" | "login" | "oauth"
      created?: null | string;
      failed?: null | boolean;
      id?: string;
      info?: null | string;
      ip_address: string;
      ip_address_remote: string;
      magic_link_id?: null | string;
      sid?: null | string;
      type?: "web" | "api_token" | "mobile"
      user_agent: string;
      username?: null | string;
      x_real_ip: string;
    };
  };
  logs: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      command?: null | string;
      connection_id?: null | string;
      created?: null | string;
      data?: null | any;
      duration?: null | string;
      error?: null | any;
      has_error?: null | boolean;
      id?: string;
      sid?: null | string;
      socket_id?: null | string;
      table_name?: null | string;
      tx_info?: null | any;
      type?: null | string;
    };
  };
  magic_links: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      expires: string;
      id?: string;
      magic_link?: null | string;
      magic_link_used?: null | string;
      session_expires?: string;
      user_id: string;
    };
  };
  mcp_install_logs: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      created?: null | string;
      error?: null | string;
      finished?: null | string;
      id: string;
      last_updated?: null | string;
      log: string;
    };
  };
  mcp_server_configs: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      config: any;
      created?: null | string;
      id?: number;
      last_updated?: null | string;
      server_name: string;
    };
  };
  mcp_server_logs: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      created?: null | string;
      id?: number;
      log: string;
      server_name: string;
    };
  };
  mcp_server_tools: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      description?: null | string;
      id?: number;
      input_schema?: null | any;
      name: string;
      server_name: string;
    };
  };
  mcp_servers: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      args?: null | string[];
      command: string;
      config_schema?: null | any;
      created?: null | string;
      cwd: string;
      enabled?: null | boolean;
      env?: null | Record<string, string>
      github_url: string;
      info?: null | string;
      last_updated?: null | string;
      name: string;
      stderr?: null | string;
    };
  };
  published_methods: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      arguments?:  ( 
 |  {  name: string;  type: 'any' | 'string' | 'number' | 'boolean' | 'Date' | 'time' | 'timestamp' | 'string[]' | 'number[]' | 'boolean[]' | 'Date[]' | 'time[]' | 'timestamp[]';  defaultValue?: string;  optional?: boolean;  allowedValues?: string[]; }
 |  {  name: string;  type: 'Lookup' | 'Lookup[]';  defaultValue?: any;  optional?: boolean;  lookup:  {    table: string;   column: string;   filter?: Record<string, any>;   isArray?: boolean;   searchColumns?: string[];   isFullRow?: {  displayColumns?: string[]; };   showInRowCard?: Record<string, any>;  }; }
 |  {  name: string;  type: 'JsonbSchema';  defaultValue?: any;  optional?: boolean;  schema: |  {  type: 'boolean' | 'number' | 'integer' | 'string' | 'Date' | 'time' | 'timestamp' | 'any' | 'boolean[]' | 'number[]' | 'integer[]' | 'string[]' | 'Date[]' | 'time[]' | 'timestamp[]' | 'any[]';  optional?: boolean;  nullable?: boolean;  description?: string;  title?: string;  defaultValue?: any; } |  {  type: 'object' | 'object[]';  optional?: boolean;  nullable?: boolean;  description?: string;  title?: string;  defaultValue?: any;  properties: Record<string,  {  type: 'boolean' | 'number' | 'integer' | 'string' | 'Date' | 'time' | 'timestamp' | 'any' | 'boolean[]' | 'number[]' | 'integer[]' | 'string[]' | 'Date[]' | 'time[]' | 'timestamp[]' | 'any[]';  optional?: boolean;  nullable?: boolean;  description?: string;  title?: string;  defaultValue?: any; }>; }; } )[]
      connection_id?: null | string;
      description?: string;
      id?: number;
      name?: string;
      outputTable?: null | string;
      package?: null | any;
      run?: string;
      tsconfig?: null | any;
    };
  };
  schema_version: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      id: string;
      table_config: any;
    };
  };
  session_types: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      id: string;
    };
  };
  sessions: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      active?: null | boolean;
      created?: null | string;
      expires: string;
      id: string;
      id_num?: number;
      ip_address: string;
      is_connected?: null | boolean;
      is_mobile?: null | boolean;
      last_used?: null | string;
      name?: null | string;
      project_id?: null | string;
      socket_id?: null | string;
      type: string;
      user_agent?: null | string;
      user_id: string;
      user_type: string;
    };
  };
  stats: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      application_name?: null | string;
      backend_start?: null | string;
      backend_type?: null | string;
      backend_xid?: null | string;
      backend_xmin?: null | string;
      blocked_by?: null | number[];
      blocked_by_num?: number;
      client_addr?: null | string;
      client_hostname?: null | string;
      client_port?: null | number;
      cmd?: null | string;
      connection_id: string;
      cpu?: null | string;
      datid?: null | number;
      datname?: null | string;
      id_query_hash?: null | string;
      mem?: null | string;
      memPretty?: null | string;
      mhz?: null | string;
      pid: number;
      query?: null | string;
      query_start?: null | string;
      state?: null | string;
      state_change?: null | string;
      usename?: null | string;
      usesysid?: null | number;
      wait_event?: null | string;
      wait_event_type?: null | string;
      xact_start?: null | string;
    };
  };
  user_statuses: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      id: string;
    };
  };
  user_types: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      description?: null | string;
      id: string;
    };
  };
  users: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      "2fa"?: null | {    secret: string;   recoveryCode: string;   enabled: boolean;  };
      auth_provider?: null | string;
      auth_provider_profile?: null | any;
      auth_provider_user_id?: null | string;
      created?: null | string;
      email?: null | string;
      has_2fa_enabled?: null | boolean;
      id?: string;
      last_updated?: null | string;
      name?: null | string;
      options?: null | {    showStateDB?: boolean;   hideNonSSLWarning?: boolean;   viewedSQLTips?: boolean;   viewedAccessInfo?: boolean;   theme?: 'dark' | 'light' | 'from-system';  };
      password: string;
      passwordless_admin?: null | boolean;
      registration?: 
       | null
       |  {  type: 'password-w-email-confirmation';  email_confirmation: |  {  status: 'confirmed';  date: string; } |  {  status: 'pending';  confirmation_code: string;  date: string; }; }
       |  {  type: 'magic-link';  otp_code: string;  date: string;  used_on?: string; }
       |  {  type: 'OAuth';  provider: 'google' | 'facebook' | 'github' | 'microsoft' | 'customOAuth';  user_id: string;  profile: any; }
      status?: string;
      type?: string;
      username: string;
    };
  };
  windows: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      closed?: null | boolean;
      columns?: null | any;
      created?: string;
      deleted?: null | boolean;
      filter?: any;
      fullscreen?: null | boolean;
      function_options?: null | {    showDefinition?: boolean;  };
      having?: any;
      id?: string;
      last_updated: string;
      limit?: null | number;
      method_name?: null | string;
      minimised?: null | boolean;
      name?: null | string;
      nested_tables?: null | any;
      options?: any;
      parent_window_id?: null | string;
      selected_sql?: string;
      show_menu?: null | boolean;
      sort?: null | any;
      sql?: string;
      sql_options?: {    executeOptions?: 'full' | 'block' | 'smallest-block';   errorMessageDisplay?: 'tooltip' | 'bottom' | 'both';   tabSize?: number;   lineNumbers?: 'on' | 'off';   renderMode?: 'table' | 'csv' | 'JSON';   minimap?: {  enabled: boolean; };   acceptSuggestionOnEnter?: 'on' | 'smart' | 'off';   expandSuggestionDocs?: boolean;   maxCharsPerCell?: number;   theme?: 'vs' | 'vs-dark' | 'hc-black' | 'hc-light';   showRunningQueryStats?: boolean;  };
      table_name?: null | string;
      table_oid?: null | number;
      type?: null | string;
      user_id: string;
      workspace_id?: null | string;
    };
  };
  workspace_publish_modes: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      description?: null | string;
      en?: null | string;
      id: string;
    };
  };
  workspaces: {
    is_view: false;
    select: true;
    insert: true;
    update: true;
    delete: true;
    columns: {
      active_row?: null | any;
      connection_id: string;
      created?: null | string;
      deleted?: boolean;
      icon?: null | string;
      id?: string;
      last_updated: string;
      last_used?: string;
      layout?: null | any;
      name?: string;
      options?: {    hideCounts?: boolean;   tableListEndInfo?: 'none' | 'count' | 'size';   tableListSortBy?: 'name' | 'extraInfo';   showAllMyQueries?: boolean;   defaultLayoutType?: 'row' | 'tab' | 'col';   pinnedMenu?: boolean;   pinnedMenuWidth?: number;  };
      parent_workspace_id?: null | string;
      publish_mode?: null | string;
      published?: boolean;
      url_path?: null | string;
      user_id: string;
    };
  };
  
}
