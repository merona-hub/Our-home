// Data layer. Two implementations with the same interface:
//  - LocalStore: saves on this device only (demo mode)
//  - FirebaseStore: shared, real-time, saved in the cloud (Firestore)

import { firebaseConfig } from './firebase-config.js';

const COLLECTIONS = ['expenses', 'bills', 'items'];

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

class LocalStore {
  constructor() {
    this.mode = 'local';
    this.key = 'ourhome-data-v1';
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(this.key)); } catch (e) { /* ignore */ }
    this.data = saved || { expenses: {}, bills: {}, items: {}, settings: {} };
    for (const c of COLLECTIONS) this.data[c] = this.data[c] || {};
    this.data.settings = this.data.settings || {};
    this.listeners = [];
  }
  async init() { return { signedIn: true }; }
  snapshot() {
    const out = { settings: { ...this.data.settings } };
    for (const c of COLLECTIONS) {
      out[c] = Object.entries(this.data[c]).map(([id, v]) => ({ ...v, id }));
    }
    return out;
  }
  persist() {
    localStorage.setItem(this.key, JSON.stringify(this.data));
    const snap = this.snapshot();
    this.listeners.forEach(cb => cb(snap));
  }
  onChange(cb) { this.listeners.push(cb); cb(this.snapshot()); }
  async add(col, obj) {
    const id = uid();
    this.data[col][id] = { ...obj, createdAt: Date.now() };
    this.persist();
    return id;
  }
  async update(col, id, patch) {
    if (!this.data[col][id]) return;
    this.data[col][id] = { ...this.data[col][id], ...patch, updatedAt: Date.now() };
    this.persist();
  }
  async remove(col, id) { delete this.data[col][id]; this.persist(); }
  async setSettings(patch) {
    this.data.settings = { ...this.data.settings, ...patch };
    this.persist();
  }
}

const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';

class FirebaseStore {
  constructor(config) {
    this.mode = 'firebase';
    this.config = config;
    this.listeners = [];
    this.state = { expenses: [], bills: [], items: [], settings: {} };
    this.loaded = new Set();
    this.unsubs = [];
  }

  async init(onAuth) {
    const [{ initializeApp }, auth, fs] = await Promise.all([
      import(FB + 'firebase-app.js'),
      import(FB + 'firebase-auth.js'),
      import(FB + 'firebase-firestore.js'),
    ]);
    this.authLib = auth;
    this.fs = fs;
    const app = initializeApp(this.config);
    this.auth = auth.getAuth(app);
    await auth.setPersistence(this.auth, auth.browserLocalPersistence);
    try {
      this.db = fs.initializeFirestore(app, {
        localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
      });
    } catch (e) {
      this.db = fs.getFirestore(app);
    }
    auth.onAuthStateChanged(this.auth, user => {
      this.user = user;
      this.unsubs.forEach(u => u());
      this.unsubs = [];
      if (user) this.subscribe();
      onAuth(user);
    });
  }

  home() { return this.fs.doc(this.db, 'homes', 'main'); }

  subscribe() {
    const { collection, onSnapshot } = this.fs;
    this.loaded = new Set();
    const onErr = err => this.listeners.forEach(cb => cb(null, err));
    for (const c of COLLECTIONS) {
      this.unsubs.push(onSnapshot(collection(this.home(), c), snap => {
        this.state[c] = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        this.loaded.add(c);
        this.emit();
      }, onErr));
    }
    this.unsubs.push(onSnapshot(this.fs.doc(this.home(), 'meta', 'settings'), snap => {
      this.state.settings = snap.exists() ? snap.data() : {};
      this.loaded.add('settings');
      this.emit();
    }, onErr));
  }

  emit() {
    if (this.loaded.size < COLLECTIONS.length + 1) return;
    const snap = { ...this.state };
    this.listeners.forEach(cb => cb(snap));
  }

  onChange(cb) { this.listeners.push(cb); }

  async signIn(email, password) {
    return this.authLib.signInWithEmailAndPassword(this.auth, email, password);
  }
  async signUp(email, password) {
    return this.authLib.createUserWithEmailAndPassword(this.auth, email, password);
  }
  async resetPassword(email) {
    return this.authLib.sendPasswordResetEmail(this.auth, email);
  }
  async signOut() { return this.authLib.signOut(this.auth); }

  // Writes return immediately (they also work offline and sync later).
  write(promise) { promise.catch(err => this.onWriteError && this.onWriteError(err)); }
  async add(col, obj) {
    const ref = this.fs.doc(this.fs.collection(this.home(), col));
    this.write(this.fs.setDoc(ref, { ...obj, createdAt: Date.now(), by: this.user?.email || null }));
    return ref.id;
  }
  async update(col, id, patch) {
    this.write(this.fs.updateDoc(this.fs.doc(this.home(), col, id),
      { ...patch, updatedAt: Date.now(), by: this.user?.email || null }));
  }
  async remove(col, id) {
    this.write(this.fs.deleteDoc(this.fs.doc(this.home(), col, id)));
  }
  async setSettings(patch) {
    this.write(this.fs.setDoc(this.fs.doc(this.home(), 'meta', 'settings'), patch, { merge: true }));
  }
}

export function createStore() {
  return firebaseConfig ? new FirebaseStore(firebaseConfig) : new LocalStore();
}
