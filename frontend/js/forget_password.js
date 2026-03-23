import { auth } from "./firebase.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const emailInput = document.getElementById("email");
const resetBtn = document.getElementById("reset-btn");

resetBtn.addEventListener("click", async function (event) {
    event.preventDefault();

    const email = emailInput.value.trim();

    if (email === "") {
        alert("Please enter your email");
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        alert("Password reset email sent successfully. Check your inbox.");
        window.location.href = "login.html";
    } catch (error) {
        console.error(error);

        if (error.code === "auth/user-not-found") {
            alert("No account found with this email");
        } else if (error.code === "auth/invalid-email") {
            alert("Invalid email address");
        } else {
            alert(error.message || "Failed to send reset email");
        }
    }
});