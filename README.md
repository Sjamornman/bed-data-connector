# Bed Data Connector

โปรเจกต์นี้ใช้สำหรับรันที่โรงพยาบาล เพื่อ:

1. query ข้อมูลเตียง/ผู้ป่วยจาก HIS ของโรงพยาบาล
2. ส่งเข้า API กลาง `POST /api/receive` ตามรอบเวลา

## 1) สิ่งที่ต้องมีบนเครื่องปลายทาง

- Node.js (แนะนำ LTS 20.x หรือใหม่กว่า)
- npm
- Git (ถ้าจะ `git clone` / `git pull`)
- PM2 (ถ้าจะรันเป็น service)

### ตรวจสอบว่าติดตั้งแล้วหรือยัง

```bash
node -v
npm -v
git --version
pm2 -v
```

ถ้าคำสั่งไหนขึ้นว่าไม่พบคำสั่ง (`not recognized`/`command not found`) แปลว่ายังไม่ได้ติดตั้ง

## 2) ติดตั้งครั้งแรก (Windows + PM2)

```bash
git clone https://github.com/Sjamornman/bed-data-connector.git
cd bed-data-connector
npm ci --include=dev
npm run build

npm install -g pm2
npm install -g pm2-windows-startup
pm2-startup install
```

## 3) ตั้งค่า `.env`

คัดลอก `.env.example` เป็น `.env` แล้วแก้ค่าจริง

```bash
copy .env.example .env
```

ค่าที่สำคัญ:

- `API_RECEIVE_URL`: URL ปลายทาง เช่น `http://your-api:3000/api/receive`
- `HCODE`: รหัสโรงพยาบาล
- `HCODE_TOKEN`: token ของโรงพยาบาลนั้น
- `LATITUDE`, `LONGITUDE`: พิกัดโรงพยาบาล (optional)
- `HIS_NAME`: ชื่อระบบ HIS (เช่น `HOSxP`, `JHCIS`)
- `HIS_DB_TYPE`: ประเภทฐานข้อมูล (`mysql`, `mariadb`, หรือ `postgres`)
- `HIS_PROFILE`: โปรไฟล์ query ของ HIS (`hosxp_v3` หรือ `hosxp_v4`)
  ถ้าไม่กำหนดจะ default เป็น `hosxp_v3`
  (หรือเดาเป็น `hosxp_v4` เมื่อ `HIS_NAME` มี `v4`)
- `HIS_DB_*`: การเชื่อมฐานข้อมูล HIS โรงพยาบาล

## 4) เริ่มรันด้วย PM2

```bash
pm2 start dist\index.js --name nbod-5110
pm2 save
```

## 5) รูปแบบ SQL ที่ต้องได้

ไฟล์ `src/his-query.ts` ต้องคืนคอลัมน์:

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

## 6) พฤติกรรมการส่งข้อมูล

- interval เริ่มต้นทุก 30 นาที (`SEND_INTERVAL_MINUTES`) และส่งตามเข็มนาฬิกา (เช่น `00/30`)
- มี retry เมื่อส่งไม่ผ่าน (`RETRY_COUNT`, `RETRY_DELAY_MS`)
- กันงานซ้อน: ถ้ารอบก่อนยังไม่จบ รอบใหม่จะ queue pending แล้วส่งทันทีเมื่อรอบปัจจุบันจบ

## 7) อัปเดตเวอร์ชันถัดไป

```bash
git pull
npm ci --include=dev
npm run build
pm2 restart nbod-5110
pm2 save
```
