import { db } from './firebase-config.js';
import {
  doc, setDoc, getDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ========== FAKE EMAIL DETECTION ==========
// Blocked disposable/fake email domains
const FAKE_EMAIL_DOMAINS = [
  'mailinator.com','guerrillamail.com','tempmail.com','throwaway.email',
  'yopmail.com','sharklasers.com','guerrillamailblock.com','grr.la',
  'guerrillamail.info','guerrillamail.biz','guerrillamail.de','guerrillamail.net',
  'guerrillamail.org','spam4.me','trashmail.com','trashmail.me','trashmail.net',
  'dispostable.com','mailnull.com','spamgourmet.com','spamgourmet.net',
  'maildrop.cc','discard.email','fakeinbox.com','mailnesia.com',
  'tempr.email','dispostable.com','spamspot.com','spamfree24.org',
  'trashmail.at','trashmail.io','spamhere.com','filzmail.com',
  'getairmail.com','courriel.fr.nf','jetable.fr.nf','nospam.ze.tc',
  'nomail.xl.cx','mega.zik.dj','speed.1s.fr','courriel.fr.nf',
  '10minutemail.com','10minutemail.net','20minutemail.com','tempemail.net',
  'temp-mail.org','emailondeck.com','throwam.com','spamgrap.com',
  'moakt.com','getnada.com','inboxbear.com','tempinbox.com',
  'spambox.us','spamevader.com','mailsac.com','spamwc.de','armyspy.com',
  'cuvox.de','dayrep.com','einrot.com','fleckens.hu','gustr.com',
  'jourrapide.com','rhyta.com','superrito.com','teleworm.us','spamwc.com'
];

function isValidEmail(email) {
  // Basic format check
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return { valid: false, reason: 'Invalid email format.' };

  const domain = email.split('@')[1].toLowerCase();

  // Block fake/disposable domains
  if (FAKE_EMAIL_DOMAINS.includes(domain)) {
    return { valid: false, reason: 'Disposable/fake email addresses are not allowed. Please use a real email.' };
  }

  // Block obviously fake patterns
  if (/^(test|fake|noreply|no-reply|dummy|temp|spam|trash|junk|null|undefined|admin@admin|user@user)/.test(email.toLowerCase())) {
    return { valid: false, reason: 'Please use a valid personal email address.' };
  }

  // Must have a real TLD (at least 2 chars, not just numbers)
  const tld = domain.split('.').pop();
  if (tld.length < 2 || /^\d+$/.test(tld)) {
    return { valid: false, reason: 'Invalid email domain.' };
  }

  return { valid: true };
}

// ========== SIMPLE SECURE PASSWORD HASH ==========
// Uses Web Crypto API — works on all platforms, no library needed
async function hashPassword(password, salt) {
  const encoder = new TextEncoder();
  const data = encoder.encode(salt + password + 'ColEvent_Secret_2025');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate a random salt
function generateSalt() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generate a session token
function generateToken(uid, role) {
  const payload = { uid, role, exp: Date.now() + (7 * 24 * 60 * 60 * 1000) }; // 7 days
  return btoa(JSON.stringify(payload));
}

function verifyToken(token) {
  try {
    const payload = JSON.parse(atob(token));
    if (payload.exp < Date.now()) return null; // expired
    return payload;
  } catch { return null; }
}

// ========== AUTH MODULE ==========
export const Auth = {
  currentUser: null,

  // ---- REGISTER ----
  async register({ username, password, name, email, phone, department, role, secretKey }) {

    // Validate inputs
    if (!username || username.length < 3) throw new Error('Username must be at least 3 characters.');
    if (!/^[a-zA-Z0-9_]+$/.test(username)) throw new Error('Username can only contain letters, numbers and underscores. No spaces.');
    if (!password || password.length < 6) throw new Error('Password must be at least 6 characters.');
    if (!name || name.trim().length < 2) throw new Error('Please enter your full name.');

    // Validate email
    const emailCheck = isValidEmail(email);
    if (!emailCheck.valid) throw new Error(emailCheck.reason);

    // Admin secret key check
    if (role === 'admin') {
      if (secretKey !== 'ADMIN123') throw new Error('Invalid admin secret key.');
    }

    const uname = username.toLowerCase().trim();

    // Check username uniqueness
    const usernameDoc = await getDoc(doc(db, 'usernames', uname));
    if (usernameDoc.exists()) throw new Error('Username already taken. Please choose another.');

    // Check email uniqueness
    const emailDoc = await getDoc(doc(db, 'emails', email.toLowerCase()));
    if (emailDoc.exists()) throw new Error('This email is already registered.');

    // Hash password with salt
    const salt = generateSalt();
    const hashedPassword = await hashPassword(password, salt);

    // Create unique ID
    const uid = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    const userData = {
      uid,
      username: uname,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone || '',
      department: department || '',
      role: role || 'student',
      passwordHash: hashedPassword,
      salt,
      createdAt: serverTimestamp()
    };

    // Save to Firestore
    await setDoc(doc(db, 'users', uid), userData);
    await setDoc(doc(db, 'usernames', uname), { uid });
    await setDoc(doc(db, 'emails', email.toLowerCase()), { uid });

    // Create session
    const token = generateToken(uid, userData.role);
    const sessionData = { ...userData, token };
    delete sessionData.passwordHash;
    delete sessionData.salt;

    localStorage.setItem('user_data', JSON.stringify(sessionData));
    localStorage.setItem('session_token', token);
    this.currentUser = sessionData;
    return sessionData;
  },

  // ---- LOGIN ----
  async login(username, password) {
    if (!username || !password) throw new Error('Please enter username and password.');

    const uname = username.toLowerCase().trim();

    // Look up username → uid
    const usernameDoc = await getDoc(doc(db, 'usernames', uname));
    if (!usernameDoc.exists()) throw new Error('Invalid username or password.');

    const { uid } = usernameDoc.data();

    // Get user profile
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) throw new Error('Account not found. Please register.');

    const userData = userDoc.data();

    // Verify password
    const hashedInput = await hashPassword(password, userData.salt);
    if (hashedInput !== userData.passwordHash) {
      throw new Error('Invalid username or password.');
    }

    // Create session
    const token = generateToken(uid, userData.role);
    const sessionData = {
      uid: userData.uid,
      username: userData.username,
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      department: userData.department,
      role: userData.role,
      token
    };

    localStorage.setItem('user_data', JSON.stringify(sessionData));
    localStorage.setItem('session_token', token);
    this.currentUser = sessionData;
    return sessionData;
  },

  // ---- LOGOUT ----
  logout() {
    localStorage.removeItem('user_data');
    localStorage.removeItem('session_token');
    this.currentUser = null;
    window.location.href = '/index.html';
  },

  // ---- GET CURRENT USER ----
  getCurrentUser() {
    const token = localStorage.getItem('session_token');
    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) {
      // Token expired
      localStorage.removeItem('user_data');
      localStorage.removeItem('session_token');
      return null;
    }

    const data = localStorage.getItem('user_data');
    if (!data) return null;
    try { return JSON.parse(data); } catch { return null; }
  },

  // ---- REQUIRE AUTH ----
  requireAuth(role) {
    const user = this.getCurrentUser();
    if (!user) { window.location.href = '/index.html'; return null; }
    if (role && user.role !== role) { window.location.href = '/index.html'; return null; }
    return user;
  }
};

// Auto-check session on protected pages
const currentPage = window.location.pathname;
if (currentPage.includes('admin.html') || currentPage.includes('student.html')) {
  const user = Auth.getCurrentUser();
  if (!user) {
    localStorage.removeItem('user_data');
    localStorage.removeItem('session_token');
    window.location.href = '/index.html';
  }
}

export default Auth;
