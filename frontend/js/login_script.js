import { auth, db } from "./firebase.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let username = document.getElementById("userName");
let password = document.getElementById("password");
let rememberMe = document.getElementById("rememberMe");
let loginBtn = document.getElementById("login-btn");

window.addEventListener("DOMContentLoaded", () => {
    const rememberedUsername = localStorage.getItem("rememberedUsername");
    const rememberedFlag = localStorage.getItem("rememberMe");

    if (rememberedFlag === "true" && rememberedUsername) {
        username.value = rememberedUsername;
        rememberMe.checked = true;
        password.focus();
    }
});

async function getEmailFromUsernameOrEmail(inputValue) {
    const value = inputValue.trim();

    if (value.includes("@")) {
        return value;
    }

    const q = query(
        collection(db, "users"),
        where("username", "==", value)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
        throw new Error("No account found with this username");
    }

    return snapshot.docs[0].data().email;
}

async function getUsernameByEmail(emailValue) {
    const q = query(
        collection(db, "users"),
        where("email", "==", emailValue)
    );

    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        return snapshot.docs[0].data().username || emailValue;
    }

    return emailValue;
}

loginBtn.addEventListener("click", async function (event) {
    event.preventDefault();

    if (username.value.trim() === "" || password.value.trim() === "") {
        showToast("Please fill in all fields.", "error");
        return;
    }

    try {
        const emailToLogin = await getEmailFromUsernameOrEmail(username.value);
        await signInWithEmailAndPassword(auth, emailToLogin, password.value);

        const currentUsername = await getUsernameByEmail(emailToLogin);
        const expiryTime = Date.now() + (24 * 60 * 60 * 1000);

        if (rememberMe.checked) {
            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("currentUser", currentUsername);
            localStorage.setItem("currentUserEmail", emailToLogin);
            localStorage.setItem("expiryTime", expiryTime.toString());
            localStorage.setItem("rememberMe", "true");
            localStorage.setItem("rememberedUsername", username.value.trim());

            sessionStorage.removeItem("isLoggedIn");
            sessionStorage.removeItem("currentUser");
            sessionStorage.removeItem("currentUserEmail");
            sessionStorage.removeItem("expiryTime");
        } else {
            sessionStorage.setItem("isLoggedIn", "true");
            sessionStorage.setItem("currentUser", currentUsername);
            sessionStorage.setItem("currentUserEmail", emailToLogin);
            sessionStorage.setItem("expiryTime", expiryTime.toString());

            localStorage.removeItem("isLoggedIn");
            localStorage.removeItem("currentUser");
            localStorage.removeItem("currentUserEmail");
            localStorage.removeItem("expiryTime");
            localStorage.removeItem("rememberMe");
            localStorage.removeItem("rememberedUsername");
        }

        window.location.href = "header.html";
    } catch (error) {
        console.error(error);
        showToast("Invalid username/email or password ❌", "error");
    }
});