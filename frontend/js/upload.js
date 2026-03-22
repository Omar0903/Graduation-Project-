// ==========================
// Cart Data
// ==========================
let cartItems = [];
let totalPrice = 0;
let c_counter = 0;

// ==========================
// Upload Elements
// ==========================
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const uploadBtn = document.getElementById("uploadBtn");
const fileNameEl = document.getElementById("fileName");

const previewImg = document.getElementById("previewImg");
const previewWrap = document.getElementById("previewWrap");

const resultsSection = document.getElementById("resultsSection");
const resultsGrid = document.getElementById("resultsGrid");
const cartBadge = document.getElementById("cartBadge");

// ==========================
// Cart Elements
// ==========================
var cart_icon = document.querySelector(".cart");
var cart_section = document.getElementById("cart_div");
var exit_cart_section_mark = document.getElementById("exit_mark");

var finalprice = document.querySelector(".final-total");
var cart_counter = document.querySelector("#cart_counter");
var cart_empty_text = document.querySelector(".cart_title");
var cart_content = document.querySelector(".cart_content");

// ==========================
// Local Storage Keys
// ==========================
const SAVED_IMAGE_KEY = "uploadedImage";
const SAVED_FILE_NAME_KEY = "uploadedFileName";
const SAVED_RESULTS_KEY = "savedResults";
const SAVED_CLASS_KEY = "savedPredictedClass";

// ==========================
// API CALL
// ==========================
async function sendImageToAPI(file) {
  let formData = new FormData();
  formData.append("file", file);

  try {
    const response = await fetch("http://127.0.0.1:8000/predict", {
      method: "POST",
      body: formData
    });

    const data = await response.json();
    console.log("API RESULT:", data);

    // حفظ النتائج والكلاس
    localStorage.setItem(SAVED_RESULTS_KEY, JSON.stringify(data.similar_images || []));
    localStorage.setItem(SAVED_CLASS_KEY, data.predicted_class || "");

    showResults(data);

    // إظهار قسم النتائج بعد ما الداتا ترجع بنجاح
    resultsSection.style.display = "block";

  } catch (error) {
    console.error(error);
    alert("Server error - تأكد إن الباك إند شغال");
  }
}

// ==========================
// Show Results From API
// ==========================
function showResults(data) {
  resultsGrid.innerHTML = "";

  if (!data.similar_images || !data.predicted_class) return;

  data.similar_images.forEach((imgPath, index) => {
    let cleanPath = imgPath.replace(/\\/g, '/');

    let classIndex = cleanPath.indexOf(data.predicted_class);
    let relativePath = "";

    if (classIndex !== -1) {
      relativePath = cleanPath.substring(classIndex);
    } else {
      relativePath = cleanPath;
    }

    let fullImageUrl = `http://127.0.0.1:8000/data/${relativePath}`;

    resultsGrid.innerHTML += `
      <div class="product_card">
        <img src="${fullImageUrl}" alt="result">
        <h4>${data.predicted_class}</h4>
        <p>$199</p>
        <button class="add_cart_btn" onclick="addToCart(${index}, '${fullImageUrl}')">
          Add to Cart
        </button>
      </div>
    `;
  });
}

// ==========================
// Restore Saved Results
// ==========================
function restoreSavedResults() {
  const savedResults = localStorage.getItem(SAVED_RESULTS_KEY);
  const savedClass = localStorage.getItem(SAVED_CLASS_KEY);

  if (!savedResults || !savedClass) return;

  const parsedResults = JSON.parse(savedResults);

  showResults({
    similar_images: parsedResults,
    predicted_class: savedClass
  });

  resultsSection.style.display = "block";
}

// ==========================
// Add To Cart
// ==========================
function addToCart(index, imageUrl) {
  let existingItem = cartItems.find(item => item.index === index);

  if (existingItem) {
    existingItem.count++;
  } else {
    cartItems.push({
      index: index,
      imageUrl: imageUrl,
      title: "Furniture Item",
      price: 199,
      count: 1
    });
  }

  c_counter++;
  totalPrice += 199;
  update_cart_items();
}

// ==========================
// Update Cart UI
// ==========================
function update_cart_items() {
  if (c_counter > 0) {
    cartBadge.hidden = false;
    cartBadge.textContent = c_counter;
  } else {
    cartBadge.hidden = true;
    cartBadge.textContent = "0";
  }

  cart_content.innerHTML = "";

  if (c_counter == 0) {
    cart_empty_text.style.display = "block";
    cart_counter.innerHTML = "your cart (0)";
    finalprice.innerHTML = "$0";

    cart_content.innerHTML = `
      <h2 class="cart_title">your cart is empty</h2>
    `;
    return;
  }

  cart_empty_text.style.display = "none";
  finalprice.innerHTML = "$" + totalPrice;
  cart_counter.innerHTML = "your cart (" + c_counter + ")";

  cartItems.forEach(function (item) {
    var cart_item = document.createElement("div");
    cart_item.classList.add("cart-item");

    cart_item.innerHTML = `
      <i class="fa-solid fa-trash cart-delete" onclick="removeItem(${item.index})"></i>
      <img src="${item.imageUrl}">
      <div class="cart-info">
        <p>${item.title}</p>
        <span class="cart-price">$${item.price}</span>
      </div>
      <div class="qty-control">
        <button onclick="decreaseQty(${item.index})">-</button>
        <span>${item.count}</span>
        <button onclick="increaseQty(${item.index})">+</button>
      </div>
    `;

    cart_content.appendChild(cart_item);
  });
}

// ==========================
// Cart Quantity Functions
// ==========================
function increaseQty(index) {
  let item = cartItems.find(i => i.index === index);
  item.count++;
  c_counter++;
  totalPrice += item.price;
  update_cart_items();
}

function decreaseQty(index) {
  let item = cartItems.find(i => i.index === index);

  if (item.count > 1) {
    item.count--;
    c_counter--;
    totalPrice -= item.price;
  } else {
    removeItem(index);
    return;
  }

  update_cart_items();
}

function removeItem(index) {
  let item = cartItems.find(i => i.index === index);
  totalPrice -= item.count * item.price;
  c_counter -= item.count;
  cartItems = cartItems.filter(i => i.index !== index);
  update_cart_items();
}

// ==========================
// Upload Logic
// ==========================
function isImageFile(file) {
  return file && file.type && file.type.startsWith("image/");
}

function showFileName(name) {
  fileNameEl.style.display = "block";
  fileNameEl.textContent = name;
}

function hideFileName() {
  fileNameEl.style.display = "none";
  fileNameEl.textContent = "";
}

// ==========================
// Preview
// ==========================
function showPreview(file) {
  const reader = new FileReader();

  reader.onload = function (e) {
    previewImg.src = e.target.result;
    previewWrap.classList.add("show");

    // حفظ الصورة نفسها
    localStorage.setItem(SAVED_IMAGE_KEY, e.target.result);
    localStorage.setItem(SAVED_FILE_NAME_KEY, file.name);

    // بمجرد عرض الصورة في البريفيو، بيبعتها للباك إند
    sendImageToAPI(file);
  };

  reader.readAsDataURL(file);
}

function clearPreview() {
  previewImg.removeAttribute("src");
  previewWrap.classList.remove("show");
}

function restoreSavedPreview() {
  const savedImage = localStorage.getItem(SAVED_IMAGE_KEY);
  const savedFileName = localStorage.getItem(SAVED_FILE_NAME_KEY);

  if (savedImage) {
    previewImg.src = savedImage;
    previewWrap.classList.add("show");
  }

  if (savedFileName) {
    showFileName(savedFileName);
  }
}

// ==========================
// Upload Button
// ==========================
uploadBtn.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (!file) return;

  if (!isImageFile(file)) {
    alert("Please upload an image file only");
    return;
  }

  showFileName(file.name);
  showPreview(file);
});

// ==========================
// Drag & Drop
// ==========================
dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("dragover");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("dragover");
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("dragover");

  const file = e.dataTransfer.files?.[0];
  if (!file) return;

  if (!isImageFile(file)) {
    alert("Please drop image only");
    return;
  }

  showFileName(file.name);
  showPreview(file);
});

// ==========================
// Cart Open / Close
// ==========================
cart_icon.onclick = function () {
  cart_section.style.display = "block";
};

exit_cart_section_mark.onclick = function () {
  cart_section.style.display = "none";
};

// ==========================
// Initial State
// ==========================
hideFileName();
clearPreview();
resultsSection.style.display = "none";

// استرجاع الصورة والنتائج المحفوظة
restoreSavedPreview();
restoreSavedResults();