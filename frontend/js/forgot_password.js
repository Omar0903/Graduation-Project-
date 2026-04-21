import { auth } from "./firebase.js";
import { sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const emailInput = document.getElementById("email");
const resetBtn = document.getElementById("reset-btn");

resetBtn.addEventListener("click", async function (e) {
    e.preventDefault();

    const email = emailInput.value.trim();

    if (email === "") {
        showToast("Please enter your email", "error");
        return;
    }

    try {
        await sendPasswordResetEmail(auth, email);
        showToast("Reset link sent to your email", "success");
        console.log("RESET EMAIL SENT SUCCESSFULLY");
    } catch (error) {
        console.error("RESET PASSWORD ERROR CODE:", error.code);
        console.error("RESET PASSWORD ERROR MESSAGE:", error.message);
        showToast(error.code + " | " + error.message, "error");
    }
});