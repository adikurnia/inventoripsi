import dotenv from "dotenv";
dotenv.config();

import express from "express";

import { client } from "./db.js";

import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";

const app = express();

// MIDDLEWARE
app.use(express.json());

// // ROUTE OTORISASI

app.post("/api/daftar", async (req, res) => {
  const results = await client.query(
    `SELECT * FROM akun WHERE username = '${req.body.user}'`
  );
  if (results.rows.length > 0) {
    res.status(401);
    res.send("Username sudah ada, gunakan username lain");
  } else {
    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(req.body.pass, salt);
    await client.query(
      `INSERT INTO akun VALUES ('${req.body.email}','${req.body.user}','${hash}','${req.body.telp}')`
    );
    res.status(200);
    res.send("Anda berhasil mendaftar");
  }
});
// Untuk mengelola cookie
app.use(cookieParser());

// Untuk memeriksa otorisasi
app.use((req, res, next) => {
  if (req.path === "/api/login" || req.path.startsWith("/assets")) {
    next();
  } else {
    let authorized = false;
    if (req.cookies.token) {
      try {
        req.me = jwt.verify(req.cookies.token, process.env.SECRET_KEY);
        authorized = true;
      } catch (err) {
        res.setHeader("Cache-Control", "no-store"); // khusus Vercel
        res.clearCookie("token");
      }
    }
    if (authorized) {
      if (
        req.path.startsWith("/login") ||
        (req.path.startsWith("/booking") && req.me.username === "adi")
      ) {
        res.redirect("/admin");
      } else if (req.path.startsWith("/login") || req.path === "/") {
        res.redirect("/booking");
      } else {
        next();
      }
    } else {
      if (req.path.startsWith("/login") || req.path.startsWith("/")) {
        next();
      } else {
        if (req.path.startsWith("/api")) {
          res.status(401);
          res.send("Anda harus login terlebih dahulu.");
        } else {
          res.redirect("/login");
        }
      }
    }
  }
});

// Untuk mengakses file statis
// app.use(express.static("public"));

// Untuk mengakses file statis (khusus Vercel)
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

app.use(express.json());
// Untuk membaca body berformat JSON

// Login (dapatkan token)
app.post("/api/login", async (req, res) => {
  const results = await client.query(
    `SELECT * FROM akun WHERE username = '${req.body.username}'`
  );
  if (results.rows.length > 0) {
    if (await bcrypt.compare(req.body.password, results.rows[0].password)) {
      const token = jwt.sign(results.rows[0], process.env.SECRET_KEY);
      res.cookie("token", token);
      res.send("Login berhasil.");
    } else {
      res.status(401);
      res.send("Kata sandi salah.");
    }
  } else {
    res.status(401);
    res.send("Mahasiswa tidak ditemukan.");
  }
});

// Dapatkan mahasiswa saat ini (yang sedang login)
app.get("/api/me", (req, res) => {
  const me = jwt.verify(req.cookies.token, process.env.SECRET_KEY);
  res.json(me);
});

app.post("/api/booking", async (req, res) => {
  await client.query(
    `INSERT INTO booking VALUES ('${req.body.name}','${req.body.email}','${req.body.instansi}','${req.body.alat_tes}','${req.body.jumlah}','${req.body.loan_date}','${req.body.payback_date}','${req.body.telp}')`
  );
  res.status(200);
  res.send("Anda berhasil melakukan booking");
});

app.get("/api/booking", async (req, res) => {
  const admin = await client.query(`SELECT * FROM booking`);
  res.status(200);
  res.json(admin.rows);
});

app.delete("/api/booking/:email", async (req, res) => {
  await client.query(`DELETE FROM booking WHERE email='${req.params.email}'`);
  res.status(200);
  res.send("Booking telah dihapus");
});

app.get("/api/logout", (_req, res) => {
  res.setHeader("Cache-Control", "no-store"); // khusus Vercel
  res.clearCookie("token");
  res.send("Logout berhasil.");
});

app.listen(3000, () => {
  console.log("Berhasil");
});
