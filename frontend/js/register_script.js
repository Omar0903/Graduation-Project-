import { auth, db } from "./firebase.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
    doc,
    setDoc,
    collection,
    query,
    where,
    getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

let fname = document.getElementById("fName");
let lname = document.getElementById("lName");
let username = document.getElementById("userName");
let email = document.getElementById("email");

let password = document.getElementById("password");
let confirmPassword = document.getElementById("confirmPassword");

let phone = document.getElementById("phone");
let address = document.getElementById("address");
let payment = document.getElementById("payment");

let sendCodeBtn = document.getElementById("sendCodeBtn");
let verifyBtn = document.getElementById("verifyBtn");
let registerBtn = document.getElementById("register-btn");

let otpInput = document.getElementById("otp");

let step1 = document.getElementById("step1");
let verifySection = document.getElementById("verifySection");
let passwordSection = document.getElementById("passwordSection");

let resendTimer = null;
let resendSeconds = 60;
let isOtpVerified = false;

function startResendTimer(seconds = 60) {
    resendSeconds = seconds;

    sendCodeBtn.disabled = true;
    sendCodeBtn.textContent = `Resend code in ${resendSeconds}s`;

    if (resendTimer) {
        clearInterval(resendTimer);
    }

    resendTimer = setInterval(() => {
        resendSeconds--;

        if (resendSeconds > 0) {
            sendCodeBtn.textContent = `Resend code in ${resendSeconds}s`;
        } else {
            clearInterval(resendTimer);
            sendCodeBtn.disabled = false;
            sendCodeBtn.textContent = "Resend Code";
        }
    }, 1000);
}

async function isUsernameTaken(userNameValue) {
    const q = query(
        collection(db, "users"),
        where("username", "==", userNameValue.trim())
    );

    const snapshot = await getDocs(q);
    return !snapshot.empty;
}

sendCodeBtn.addEventListener("click", async () => {
    if (
        fname.value.trim() === "" ||
        lname.value.trim() === "" ||
        username.value.trim() === "" ||
        email.value.trim() === ""
    ) {
        showToast("Fill all fields first", "error");
        return;
    }

    try {
        const taken = await isUsernameTaken(username.value);
        if (taken) {
            showToast("Username already exists", "error");
            return;
        }

        const res = await fetch("http://127.0.0.1:8000/send-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: email.value.trim(),
                username: username.value.trim()
            })
        });

        const data = await res.json();

        if (!res.ok) {
            showToast(data.message || "Failed to send code", "error");
            return;
        }

        showToast(data.message || "Verification code sent successfully", "success");
        verifySection.style.display = "block";
        startResendTimer(data.expires_in || 60);
    } catch (err) {
        console.error(err);
        showToast("Error sending code", "error");
    }
});

verifyBtn.addEventListener("click", async () => {
    if (otpInput.value.trim() === "") {
        showToast("Enter verification code", "error");
        return;
    }

    try {
        const res = await fetch("http://127.0.0.1:8000/verify-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: email.value.trim(),
                code: otpInput.value.trim()
            })
        });

        const data = await res.json();

        if (data.status === "success") {
            isOtpVerified = true;
            showToast("Verified ✅", "success");

            step1.style.display = "none";
            verifySection.style.display = "none";
            passwordSection.style.display = "block";

            if (resendTimer) {
                clearInterval(resendTimer);
            }
        } else if (data.status === "expired") {
            showToast("Code expired. Please resend a new code.", "error");
        } else {
            showToast(data.message || "Wrong code ❌", "error");
        }
    } catch (err) {
        console.error(err);
        showToast("Error verifying", "error");
    }
});

registerBtn.addEventListener("click", async function (event) {
    event.preventDefault();

    if (!isOtpVerified) {
        showToast("Please verify your email first", "error");
        return;
    }

    if (
        password.value.trim() === "" ||
        confirmPassword.value.trim() === "" ||
        phone.value.trim() === "" ||
        address.value.trim() === ""
    ) {
        showToast("Please fill in all fields", "error");
        return;
    }

    if (password.value !== confirmPassword.value) {
        showToast("Passwords do not match", "error");
        return;
    }

    try {
        const taken = await isUsernameTaken(username.value);
        if (taken) {
            showToast("Username already exists", "error");
            return;
        }

        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email.value.trim(),
            password.value
        );

        const user = userCredential.user;

        await setDoc(doc(db, "users", user.uid), {
            fname: fname.value.trim(),
            lname: lname.value.trim(),
            username: username.value.trim(),
            email: email.value.trim(),
            phone: phone.value.trim(),
            address: address.value.trim(),
            payment: payment.value,
            createdAt: new Date().toISOString()
        });

        showToast("Account Created ✅", "success");
        window.location.href = "login.html";
    } catch (error) {
        console.error(error);

        if (error.code === "auth/email-already-in-use") {
            showToast("This email is already registered", "error");
        } else if (error.code === "auth/invalid-email") {
            showToast("Invalid email", "error");
        } else if (error.code === "auth/weak-password") {
            showToast("Password should be at least 6 characters", "error");
        } else {
            showToast(error.message || "Registration failed", "error");
        }
    }
});