## Integrasi Datalakehouse dan Model BI-LSTM untuk Prediksi Indeks Standar Pencemaran Udara

---

### Pembuat

|  **NIM**  | **NAMA** |               **GITHUB**                |      **Email**       |
| :-------: | :------: | :-------------------------------------: | :------------------: |
| 535220118 |  Shinzi  | [Shinzi04](https://github.com/Shinzi04) | shinzisaja@gmail.com |

---

### Deskripsi Umum

Project ini bertujuan untuk mengintegrasikan model BI-LSTM dan Arsitektur Data Lakehouse untuk menghasilkan prediksi indeks standar pencemaran udara di Kota Yogyakarta.

### Komponen Proyek

- **Dremio** sebagai _data lakehouse query engine_.
- **MinIO** sebagai _object storage_ (S3-compatible) dan unit penyimpanan data.
- **Project Nessie** sebagai _version control_ untuk data.
- **Web Services (Apis)** sebagai media komunikasi antar komponen. Web Services direalisasikan dengan:
  - Tensorflow dan Keras -> Pembelajaran Model.
  - FastAPI -> API Backend.
  - JWT -> Autentikasi.
- **Frontend Application** sebagai _user interface_ untuk melihat hasil prediksi. Frontend direalisasikan dengan:
  - ReactJS
  - TailwindCSS
  - Vite
  - Axios

---

### Instalasi dan Konfigurasi

#### Requirement:

- Docker-Desktop : [Official Docker Desktop](https://www.docker.com/products/docker-desktop/)

---

#### Langkah-langkah:

1. Clone repository dari GitHub: [Integrasi Datalakehouse dan Model BI-LSTM](https://github.com/Shinzi04/Skripsi_Untar_535220118.git).

- `git clone https://github.com/Shinzi04/Skripsi_Untar_535220118.git`

2. Buat file `.env` pada direktori `/app`, format .env dapat dilihat pada `.env.example`

- ```env
  MINIO_ENDPOINT = "localhost:9000"
  MINIO_ACCESS_KEY = "admin"
  MINIO_SECRET_KEY = "admin1234"
  MINIO_DATALAKE_BUCKET = "datalake"

  DREMIO_ENDPOINT = "grpc+tcp://localhost:32010"
  DREMIO_USERNAME = "admin"
  DREMIO_PASSWORD = "admin1234"

  # ISI DI BAWAH INI
  ADMIN_USER= # Username akses fitur admin pada website
  ADMIN_PASSWORD= # Password akses fitur admin pada website
  JWT_SECRET= # Kunci rahasia
  JWT_EXPIRES_MIN= # Berapa menit lama token aktif
  ```

3. Jalankan Docker.
4. Jalankan Docker Compose.

- `docker-compose up -d`

5. Setelah semua _container_ aktif, pertama akses Dremio melalui [localhost:9047](http://localhost:9047) dan buat akun Dremio dan login dengan akun tersebut.
6. Selanjutnya koneksikan unit penyimpanan yaitu MinIO dengan menggunakan fitur `Add Data Source`. Berikut merupakan kredensial MinIO pada Dremio:

- **General**
  - Name: `MinIO`
  - Authentication type: `AWS Secret Key`
    - AWS access key: `admin` <-- Sesuai dengan akun MinIO
    - AWS secret key: `admin1234` <-- Sesuai dengan akun MinIO
  - Encrypt connection: `None`
- **Advanced Options**

  - Enable compatibility mode: `True`
  - Root Path: `datalake`
  - Default CTAS Format: `ICEBERG`
  - Connection Properties:

    | Name                       | Value        |
    | :------------------------- | :----------- |
    | `fs.s3a.path.style.access` | `true`       |
    | `fs.s3a.endpoint`          | `minio:9000` |
    | `fs.s3a.compat.s3a`        | `true`       |

7. Selanjutnya koneksikan Nessie dengan menu `Add Data Source` pada halaman utama Dremio. Tutorial dapat diakses melalui website resmi Dremio: [Introducing Nessie as a Dremio Source](https://www.dremio.com/blog/introducing-nessie-as-a-dremio-source/), dengan kredensial data seperti berikut:

- **General**
  - Name: `Nessie`
  - Nessie endpoint URL: `"http://nessie:19120/api/v2"`
  - Nessie authentication type: `None`
- **Storage**
  - AWS root path: `datalakehouse`
  - Authentication method: `AWS Access Key`
    - AWS access key: `admin` <-- Sesuai dengan akun MinIO
    - AWS secret key: `admin1234` <-- Sesuai dengan akun MinIO
- **Advanced Options**
  - Connection Properties:
    | Name | Value |
    | :--- | :--- |
    | `fs.s3a.path.style.access`|`true`|
    | `fs.s3a.endpoint`|`minio:9000`|
    | `fs.s3a.compat.s3a`|`true`|

8. Setelah semua MinIO dan Nessie sudah terkoneksikan, API dapat diakses melalui [localhost:8080](http://localhost:8080). dan aplikasi prediksi dapat diakses melalui [localhost:5173](http://localhost:5173).

---
