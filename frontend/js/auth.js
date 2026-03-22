function clearAuthData() {
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("currentUser");
    localStorage.removeItem("expiryTime");

    sessionStorage.removeItem("isLoggedIn");
    sessionStorage.removeItem("currentUser");
    sessionStorage.removeItem("expiryTime");
}

function getAuthData() {
    let isLoggedIn = localStorage.getItem("isLoggedIn");
    let currentUser = localStorage.getItem("currentUser");
    let expiryTime = localStorage.getItem("expiryTime");

    if (isLoggedIn === "true" && currentUser && expiryTime) {
        return {
            isLoggedIn,
            currentUser,
            expiryTime
        };
    }

    isLoggedIn = sessionStorage.getItem("isLoggedIn");
    currentUser = sessionStorage.getItem("currentUser");
    expiryTime = sessionStorage.getItem("expiryTime");

    if (isLoggedIn === "true" && currentUser && expiryTime) {
        return {
            isLoggedIn,
            currentUser,
            expiryTime
        };
    }

    return null;
}

const authData = getAuthData();

if (!authData) {
    window.location.replace = "login.html";
} else {
    const now = Date.now();
    const expiry = parseInt(authData.expiryTime, 10);

    if (now > expiry) {
        clearAuthData();
        window.location.replace = "login.html";
    }
}