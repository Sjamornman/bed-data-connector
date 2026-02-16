export type ConnectorConfig = {
  apiReceiveUrl: string;
  hcode: string;
  hcodeToken: string;
  hisName: string;
  hisDbType: "mysql" | "mariadb" | "postgres";
  hisProfile: "hosxp_v3" | "hosxp_v4";
  hisDb: {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
  };
  sendIntervalMinutes: number;
  sendOffsetMinutes: number;
  requestTimeoutMs: number;
  retryCount: number;
  retryDelayMs: number;
  latitude: number | null;
  longitude: number | null;
};

export type RawWardRow = {
  ward_id: unknown;
  ward_name: unknown;
  bed_actual: unknown;
  patient_actual: unknown;
};

export type WardPayload = {
  ward_id: string;
  ward_name: string;
  bed_actual: number;
  patient_actual: number;
};
