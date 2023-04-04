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

app.post("/api/booking", async (req, res) => {
  console.log(req.body);
  const results = await client.query(
    `SELECT * FROM akun WHERE username = '${req.body.user}'`
  );
  if (results.rows.length > 0) {
    res.status(401);
    res.send("Username sudah ada, gunakan username lain");
  } else {
    const salt = await bcrypt.genSalt();
    const hash = await bcrypt.hash(req.body.pass, salt);
    console.log(hash);
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
      if (req.path.startsWith("/login") && req.me.username === "adi") {
        res.redirect("/admin");
      } else if (req.path.startsWith("/login")) {
        res.redirect("/booking");
      } else {
        next();
      }
    } else {
      if (req.path.startsWith("/login")) {
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

// app.use(express.static("public"));
app.listen(3000, () => {
  console.log("Berhasil");
});
