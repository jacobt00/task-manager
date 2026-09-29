require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline');
const User = require('../src/models/User');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = question => new Promise(resolve => rl.question(question, resolve));
(async () => {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI required');
  const name = (await ask('Admin name: ')).trim();
  const email = (await ask('Admin email: ')).trim().toLowerCase();
  const password = await ask('Initial password (12+ chars; terminal input visible): ');
  if (!name || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 72) throw new Error('Invalid input');
  await mongoose.connect(process.env.MONGODB_URI);
  if (await User.exists({ email })) throw new Error('Account already exists; no role escalation performed');
  await User.create({ name, email, role: 'admin', passwordHash: await User.hashPassword(password) });
  console.log('Admin created.');
})().catch(err => { console.error(err.message); process.exitCode = 1; }).finally(async () => { rl.close(); await mongoose.disconnect(); });
