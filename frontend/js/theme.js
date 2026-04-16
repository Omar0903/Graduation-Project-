document.addEventListener("DOMContentLoaded", () => {

    const toggleBtn = document.getElementById("themeToggle");

    // تحميل الوضع المحفوظ
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {
        document.body.classList.add("dark-mode");
        toggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
    }

    // عند الضغط
    toggleBtn.addEventListener("click", () => {
        document.body.classList.toggle("dark-mode");

        if (document.body.classList.contains("dark-mode")) {
            localStorage.setItem("theme", "dark");
            toggleBtn.innerHTML = '<i class="fa-solid fa-sun"></i>';
        } else {
            localStorage.setItem("theme", "light");
            toggleBtn.innerHTML = '<i class="fa-solid fa-moon"></i>';
        }
    });

});