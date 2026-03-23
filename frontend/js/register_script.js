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
        alert("Fill all fields first");
        return;
    }

    try {
        const taken = await isUsernameTaken(username.value);
        if (taken) {
            alert("Username already exists");
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
            alert(data.message || "Failed to send code");
            return;
        }

        alert(data.message || "Verification code sent successfully");
        verifySection.style.display = "block";
        startResendTimer(data.expires_in || 60);
    } catch (err) {
        console.error(err);
        alert("Error sending code");
    }
});

verifyBtn.addEventListener("click", async () => {
    if (otpInput.value.trim() === "") {
        alert("Enter verification code");
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
            alert("Verified ✅");

            step1.style.display = "none";
            verifySection.style.display = "none";
            passwordSection.style.display = "block";

            if (resendTimer) {
                clearInterval(resendTimer);
            }
        } else if (data.status === "expired") {
            alert("Code expired. Please resend a new code.");
        } else {
            alert(data.message || "Wrong code ❌");
        }
    } catch (err) {
        console.error(err);
        alert("Error verifying");
    }
});

registerBtn.addEventListener("click", async function (event) {
    event.preventDefault();

    if (!isOtpVerified) {
        alert("Please verify your email first");
        return;
    }

    if (
        password.value.trim() === "" ||
        confirmPassword.value.trim() === "" ||
        phone.value.trim() === "" ||
        address.value.trim() === ""
    ) {
        alert("Please fill in all fields");
        return;
    }

    if (password.value !== confirmPassword.value) {
        alert("Passwords do not match");
        return;
    }

    try {
        const taken = await isUsernameTaken(username.value);
        if (taken) {
            alert("Username already exists");
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

        alert("Account Created ✅");
        window.location.href = "login.html";
    } catch (error) {
        console.error(error);

        if (error.code === "auth/email-already-in-use") {
            alert("This email is already registered");
        } else if (error.code === "auth/invalid-email") {
            alert("Invalid email");
        } else if (error.code === "auth/weak-password") {
            alert("Password should be at least 6 characters");
        } else {
            alert(error.message || "Registration failed");
        }
    }
});