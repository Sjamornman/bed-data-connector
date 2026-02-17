"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHisQuery = getHisQuery;
const HOSXP_V3_QUERY = `
SELECT
  w.ward AS ward_id,
  w.name AS ward_name,
  w.bedcount AS bed_actual,
  COALESCE(p.patient_actual, 0) AS patient_actual
FROM ward w
LEFT JOIN (
  SELECT i.ward, COUNT(*) AS patient_actual
  FROM ipt i
  WHERE i.dchdate IS NULL  
  GROUP BY i.ward
) AS p ON p.ward = w.ward
WHERE w.ward_active = 'Y' 
`;
const HOSXP_V4_QUERY = `
SELECT
  w.ward AS ward_id,
  w.name AS ward_name,
  w.bedcount AS bed_actual,
  COALESCE(p.patient_actual, 0) AS patient_actual
FROM ward w
LEFT JOIN (
  SELECT i.ward, COUNT(*) AS patient_actual
  FROM ipt i
  WHERE i.dchdate IS NULL
  GROUP BY i.ward
) p ON p.ward = w.ward
WHERE w.ward_active = 'Y'
`;
function getHisQuery(profile) {
    if (profile === 'hosxp_v4') {
        return HOSXP_V4_QUERY;
    }
    return HOSXP_V3_QUERY;
}
