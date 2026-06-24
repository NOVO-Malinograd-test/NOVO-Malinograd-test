import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCj-GoD1eBbTWjnHeKNN-p2ymcVC-zL2B0",
  authDomain: "test-novo-malinogrda-rrp.firebaseapp.com",
  projectId: "test-novo-malinogrda-rrp",
  storageBucket: "test-novo-malinogrda-rrp.firebasestorage.app",
  messagingSenderId: "706091384352",
  appId: "1:706091384352:web:8b42473392454a35388645",
  measurementId: "G-14LMLMYLK6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

window.login = () => signInWithPopup(auth, provider);

window.sendMessage = () => {
    const input = document.getElementById('messageInput');
    if (!input.value.trim() || !auth.currentUser) return;
    addDoc(collection(db, "messages"), {
        text: input.value,
        user: auth.currentUser.displayName,
        createdAt: serverTimestamp()
    });
    input.value = '';
};

onSnapshot(query(collection(db, "messages"), orderBy("createdAt")), (snapshot) => {
    const chatBox = document.getElementById('chatBox');
    chatBox.innerHTML = '';
    snapshot.forEach(doc => {
        const m = doc.data();
        chatBox.innerHTML += `<p><b>${m.user}:</b> ${m.text}</p>`;
    });
});