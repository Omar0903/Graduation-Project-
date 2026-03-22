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

// هنستخدم نفس زرار الإرسال كـ resend
let resendTimer = null;
let resendSeconds = 60;

// ==========================
// Timer
// ==========================
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

// ==========================
// STEP 1 → SEND OTP
// ==========================
sendCodeBtn.addEventListener("click", async () => {
    if (
        fname.value === "" ||
        lname.value === "" ||
        username.value === "" ||
        email.value === ""
    ) {
        alert("Fill all fields first");
        return;
    }

    try {
        const res = await fetch("http://127.0.0.1:8000/send-code", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
            email: email.value,
            username: username.value})
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
        alert("Error sending code");
    }
});

// ==========================
// STEP 2 → VERIFY OTP
// ==========================
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
                email: email.value,
                code: otpInput.value
            })
        });

        const data = await res.json();

        if (data.status === "success") {
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
        alert("Error verifying");
    }
});

// ==========================
// STEP 3 → REGISTER
// ==========================
registerBtn.addEventListener("click", function (event) {
    event.preventDefault();

    if (password.value === "" || confirmPassword.value === "") {
        alert("Enter password");
        return;
    }

    if (password.value !== confirmPassword.value) {
        alert("Passwords do not match");
        return;
    }

    localStorage.setItem("fname", fname.value);
    localStorage.setItem("lname", lname.value);
    localStorage.setItem("username", username.value);
    localStorage.setItem("email", email.value);
    localStorage.setItem("password", password.value);
    localStorage.setItem("phone", phone.value);
    localStorage.setItem("address", address.value);
    localStorage.setItem("payment", payment.value);

    alert("Account Created ✅");
    window.location.href = "login.html";
});