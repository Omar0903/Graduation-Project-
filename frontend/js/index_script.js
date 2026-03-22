let userInfo = document.querySelector("#user_info")
let userName = document.querySelector("#user")
let links = document.querySelector("#links")

if(localStorage.getItem("username"))
{
    links.remove()
    userInfo.style.display = "block"
    userName.innerHTML = localStorage.getItem("username")
}