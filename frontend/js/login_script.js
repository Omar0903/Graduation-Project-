let username = document.getElementById("userName");
let password = document.getElementById("password");
let rememberMe = document.getElementById("rememberMe");
let loginBtn = document.getElementById("login-btn");

let storedUsername = localStorage.getItem("username");
let storedPassword = localStorage.getItem("password");

window.addEventListener("DOMContentLoaded", () => {
    const rememberedUsername = localStorage.getItem("rememberedUsername");
    const rememberedFlag = localStorage.getItem("rememberMe");

    if (rememberedFlag === "true" && rememberedUsername) {
        username.value = rememberedUsername;
        rememberMe.checked = true;
        password.focus();
    }
});

loginBtn.addEventListener("click", function (event) {
    event.preventDefault();

    if (username.value === "" || password.value === "") {
        alert("Please fill in all fields.");
        return;
    }

    if (
        storedUsername &&
        storedUsername.trim() === username.value.trim() &&
        storedPassword &&
        storedPassword.trim() === password.value.trim()
    ) {
        const currentUser = username.value.trim();
        const expiryTime = Date.now() + (24 * 60 * 60 * 1000);

        if (rememberMe.checked) {
            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("currentUser", currentUser);
            localStorage.setItem("expiryTime", expiryTime.toString());
            localStorage.setItem("rememberMe", "true");
            localStorage.setItem("rememberedUsername", currentUser);

            sessionStorage.removeItem("isLoggedIn");
            sessionStorage.removeItem("currentUser");
            sessionStorage.removeItem("expiryTime");
        } else {
            sessionStorage.setItem("isLoggedIn", "true");
            sessionStorage.setItem("currentUser", currentUser);
            sessionStorage.setItem("expiryTime", expiryTime.toString());

            localStorage.removeItem("isLoggedIn");
            localStorage.removeItem("currentUser");
            localStorage.removeItem("expiryTime");
            localStorage.removeItem("rememberMe");
            localStorage.removeItem("rememberedUsername");
        }

        setTimeout(() => {
            window.location.href = "header.html";
        }, 1000);
    } else {
        alert("Invalid username or password.");
    }
});