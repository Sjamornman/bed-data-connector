# Bed Data Connector

โปรเจกต์นี้ไว้แจกให้แต่ละโรงพยาบาลไปรันในเครื่องตัวเอง เพื่อ:

1. query ข้อมูลเตียง/ผู้ป่วยจาก HIS ของตัวเอง
2. ส่งเข้า API กลาง `POST /api/receive` ตามรอบเวลา

## 1) ติดตั้ง

```bash
npm install
```

## 2) ตั้งค่า

คัดลอก `.env.example` เป็น `.env` แล้วแก้ค่าจริง

ค่าที่สำคัญ:

- `API_RECEIVE_URL`: URL ปลายทาง เช่น `http://your-api:3000/api/receive`
- `HCODE`: รหัสโรงพยาบาล
- `HCODE_TOKEN`: token ของโรงพยาบาลนั้น
- `LATITUDE`, `LONGITUDE`: พิกัดโรงพยาบาล (optional)
- `HIS_NAME`: ชื่อระบบ HIS (เช่น `HOSxP`, `JHCIS`)
- `HIS_DB_TYPE`: ประเภทฐานข้อมูล (`mysql`, `mariadb`, หรือ `postgres`)
- `HIS_PROFILE`: โปรไฟล์ query ของ HIS (`hosxp_v3` หรือ `hosxp_v4`) ถ้าไม่กำหนดจะ default เป็น `hosxp_v3` (หรือเดาเป็น `hosxp_v4` เมื่อ `HIS_NAME` มี `v4`)
- `HIS_DB_*`: การเชื่อมฐานข้อมูล HIS โรงพยาบาล
- query อยู่ที่ไฟล์ `src/his-query.ts`

## 3) รูปแบบ SQL ที่ต้องได้

ไฟล์ `src/his-query.ts` ต้องคืนคอลัมน์เหล่านี้:

- `ward_id`
- `ward_name`
- `bed_actual`
- `patient_actual`

ตัวอย่าง:

```sql
SELECT
  ward_code AS ward_id,
  ward_name,
  bed_actual,
  patient_actual
FROM his_bed_view
WHERE is_active = 1
```

## 4) รัน

รันต่อเนื่องตามรอบเวลา (TypeScript runtime):

```bash
npm run start:dev
```

รันส่งครั้งเดียว:

```bash
npm run start:once
```

build เป็น JavaScript:

```bash
npm run build
npm start
```

## 5) พฤติกรรมส่งข้อมูล

- interval ค่าเริ่มต้นทุก 30 นาที (`SEND_INTERVAL_MINUTES`) และส่งตามเข็มนาฬิกา (เช่น `00/30`)
- มี retry เมื่อส่งไม่ผ่าน (`RETRY_COUNT`, `RETRY_DELAY_MS`)
- กันงานซ้อน: ถ้ารอบก่อนยังไม่จบ รอบใหม่จะ queue pending แล้วส่งทันทีเมื่อรอบปัจจุบันจบ

git clone https://github.com/Sjamornman/bed-data-connector.git
cd bed-data-connector
npm ci --include=dev
npm run build

pm2 start dist\index.js --name nbod-5110

git pull
npm ci --include=dev
npm run build
pm2 restart nbod-5110
