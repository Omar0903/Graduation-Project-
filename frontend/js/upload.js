import { auth, db } from "./firebase.js";
import { doc, getDoc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

async function updateUserSearchHistory(className) {
  if (!className || className === "Image Results" || className === "Search Results") return;
  
  const user = auth.currentUser;
  if (!user) return; // Only track for logged-in users

  try {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      let searchCounts = userData.searchCounts || {};
      searchCounts[className] = (searchCounts[className] || 0) + 1;
      await updateDoc(userRef, { searchCounts });
    }
  } catch (error) {
    console.error("Error updating search history:", error);
  }
}

// ==========================
// Cart Data
// ==========================
let cartItems = JSON.parse(localStorage.getItem('manzili_cart')) || [];
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
// Formatting & Localization
// ==========================
function formatCategoryName(name) {
  if (!name) return 'Category';
  let cleanName = name.replace(/_dataset/gi, "").replace(/ dataset/gi, "").replace(/_/g, " ").trim();
  return cleanName.replace(/\\b\\w/g, char => char.toUpperCase());
}

function generatePrice(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return (Math.abs(hash) % 850) + 50; // Random price between 50 and 899
}

function formatCurrency(amount) {
  const lang = localStorage.getItem('appLang') || 'en';
  if (lang === 'ar') {
    // Convert USD to EGP (e.g. rate 50) and format
    const egpAmount = amount * 50;
    return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(egpAmount);
  } else {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  }
}

window.addEventListener('langChanged', () => {
  update_cart_items(); // Re-render cart with new currency/text
  
  // Determine which context we are in to re-render appropriately
  const urlParams = new URLSearchParams(window.location.search);
  const categoryId = urlParams.get('class');
  
  if (window.location.pathname.includes('best_sellers.html')) {
    if (typeof window.loadBestSellers === 'function') {
        window.loadBestSellers();
    }
  } else if (categoryId && typeof window.loadCategoryImages === 'function') {
    window.loadCategoryImages(categoryId, typeof currentCategoryPage !== 'undefined' ? currentCategoryPage : 1);
    populateSidebar(categoryId);
  } else if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/' && !window.location.pathname.endsWith('/')) {
    // Only restore search results if not on home, category or best sellers page
    restoreSavedResults();
  }
});

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

    localStorage.setItem(SAVED_RESULTS_KEY, JSON.stringify(data));
    localStorage.setItem(SAVED_CLASS_KEY, data.predicted_class || "Image Results");
    
    // Track search history
    if (data.predicted_class) {
      updateUserSearchHistory(data.predicted_class);
    }

    showResults(data);
    resultsSection.style.display = "block";
  } catch (error) {
    console.error(error);
    showToast("Server error - تأكد إن الباك إند شغال");
  }
}

// ==========================
// TEXT SEARCH API
// ==========================
async function sendTextSearch(query) {
  if (!query) return;

  // If we are NOT on text_search.html, redirect there with the query
  if (!window.location.pathname.includes("text_search.html")) {
    window.location.href = `text_search.html?q=${encodeURIComponent(query)}`;
    return;
  }

  // Update URL to match search and allow refreshing
  const newUrl = new URL(window.location);
  newUrl.searchParams.set('q', query);
  window.history.pushState({}, '', newUrl);

  // Otherwise, we ARE on text_search.html, so do the search
  try {
    const resultsGrid = document.getElementById("resultsGrid");
    if (resultsGrid) {
        const lang = localStorage.getItem('appLang') || 'en';
        resultsGrid.innerHTML = `<h2>${lang === 'ar' ? 'جاري البحث...' : 'Searching...'}</h2>`;
    }
    const response = await fetch(`http://127.0.0.1:8000/search-text?query=${encodeURIComponent(query)}`);
    const data = await response.json();
    console.log("TEXT SEARCH RESULT:", data);

    if (data.similar_items && data.similar_items.length > 0) {
        localStorage.setItem(SAVED_RESULTS_KEY, JSON.stringify(data));
        
        // Track search history for text search. Text search may not return predicted_class, so check category of first item
        const firstCategory = data.similar_items[0].category;
        if (firstCategory && firstCategory !== "Search Results") {
          updateUserSearchHistory(firstCategory);
        }

        showResults(data);
        if (resultsSection) resultsSection.style.display = "block";
        
        // Scroll to results
        if (resultsSection) resultsSection.scrollIntoView({ behavior: 'smooth' });
    } else {
        if (resultsGrid) resultsGrid.innerHTML = "";
        const lang = localStorage.getItem('appLang') || 'en';
        if(typeof showToast !== 'undefined') showToast(lang === 'ar' ? "لم يتم العثور على نتائج" : "No results found", "error");
    }
  } catch (error) {
    console.error(error);
    if(typeof showToast !== 'undefined') showToast("Server error - تأكد إن الباك إند شغال", "error");
  }
}

// ==========================
// Show Results From API
// ==========================
function showResults(data) {
  resultsGrid.innerHTML = "";

  const lang = localStorage.getItem('appLang') || 'en';

  if (data.similar_items) {
    data.similar_items.forEach((item, index) => {
      let cleanPath = item.image.replace(/\\/g, '/');
      
      // Handle Kaggle paths
      let kaggleDataIndex = cleanPath.indexOf('/data/');
      if (kaggleDataIndex !== -1 && cleanPath.includes('kaggle')) {
        cleanPath = cleanPath.substring(kaggleDataIndex + 1); // Extract 'data/...'
      }
      
      // Handle other potential path issues by looking for dataset class names
      let relativePath = cleanPath;
      if (item.category && item.category !== "Search Results") {
        let classIndex = cleanPath.indexOf(item.category);
        if (classIndex !== -1) {
          relativePath = "data/" + cleanPath.substring(classIndex);
        }
      } else {
         // Fallback if we just have /kaggle/working/data/Bed_dataset...
         let dataIndex = cleanPath.indexOf('data/');
         if (dataIndex !== -1) {
             relativePath = cleanPath.substring(dataIndex);
         }
      }
      
      // Ensure it doesn't double up on data/
      if (relativePath.startsWith('data/')) {
        relativePath = relativePath.substring(5);
      }

      let fullImageUrl = `http://127.0.0.1:8000/data/${relativePath}`;

      let displayCat = formatCategoryName(item.category);
      if (lang === 'ar') displayCat = translateCategory(displayCat);

      resultsGrid.innerHTML += `
        <div class="product_card">
          <img src="${fullImageUrl}" alt="result" onerror="this.src='images/placeholder.png'">
          <h4>${displayCat}</h4>
          <p>${formatCurrency(item.price)}</p>
          <button class="add_cart_btn" onclick="addToCart('${fullImageUrl}', ${item.price}, '${displayCat.replace(/'/g, "\\'")}')">
            ${lang === 'ar' ? 'أضف للسلة' : 'Add to Cart'}
          </button>
        </div>
      `;
    });
  } else if (data.similar_images) {
    data.similar_images.forEach((imgPath, index) => {
      let cleanPath = imgPath.replace(/\\/g, '/');

      let classIndex = cleanPath.indexOf(data.predicted_class);
      let relativePath = "";

      if (classIndex !== -1) {
        relativePath = cleanPath.substring(classIndex);
      } else {
        relativePath = cleanPath;
      }

      if (relativePath.startsWith('data/')) {
        relativePath = relativePath.substring(5);
      }

      let fullImageUrl = `http://127.0.0.1:8000/data/${relativePath}`;

      let displayCat = formatCategoryName(data.predicted_class);
      if (lang === 'ar') displayCat = translateCategory(displayCat);
      
      let itemPrice = generatePrice(fullImageUrl);

      resultsGrid.innerHTML += `
        <div class="product_card">
          <img src="${fullImageUrl}" alt="result" onerror="this.src='images/placeholder.png'">
          <h4>${displayCat}</h4>
          <p>${formatCurrency(itemPrice)}</p>
          <button class="add_cart_btn" onclick="addToCart('${fullImageUrl}', ${itemPrice}, '${displayCat.replace(/'/g, "\\'")}')">
            ${lang === 'ar' ? 'أضف للسلة' : 'Add to Cart'}
          </button>
        </div>
      `;
    });
  }
}

// ==========================
// Restore Saved Results
// ==========================
function restoreSavedResults() {
  const savedResults = localStorage.getItem(SAVED_RESULTS_KEY);

  if (!savedResults) return;

  const parsedResults = JSON.parse(savedResults);
  
  // If it's an array (old format), wrap it in an object
  if (Array.isArray(parsedResults)) {
      const savedClass = localStorage.getItem(SAVED_CLASS_KEY) || "Image Results";
      showResults({
          similar_images: parsedResults,
          predicted_class: savedClass
      });
  } else {
      showResults(parsedResults);
  }

  resultsSection.style.display = "block";
}

let cartItemIndexCounter = 0;

// ==========================
// Add To Cart
// ==========================
function addToCart(imageUrl, price = 199, title = "Furniture Item") {
  let existingItem = cartItems.find(item => item.imageUrl === imageUrl);

  if (existingItem) {
    existingItem.quantity++;
  } else {
    cartItems.push({
      index: cartItemIndexCounter++,
      imageUrl: imageUrl,
      price: price,
      quantity: 1,
      category: title
    });
  }

  // Save to localStorage
  localStorage.setItem('manzili_cart', JSON.stringify(cartItems));

  // Remove the line that automatically opens the cart
  // cart_section.style.display = "block";
  const lang = localStorage.getItem('appLang') || 'en';
  if (typeof showToast === 'function') {
    showToast(lang === 'ar' ? 'تمت الإضافة للسلة بنجاح' : 'Added to cart successfully', 'success');
  }

  update_cart_items();
}

// ==========================
// Update Cart UI
// ==========================
function update_cart_items() {
  const lang = localStorage.getItem('appLang') || 'en';

  // Recalculate global state from cartItems array
  c_counter = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

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
    cart_counter.innerHTML = lang === 'ar' ? `عربة التسوق (0)` : `your cart (0)`;
    finalprice.innerHTML = formatCurrency(0);

    cart_content.innerHTML = `
      <h2 class="cart_title">${lang === 'ar' ? 'عربة التسوق فارغة' : 'your cart is empty'}</h2>
    `;
    return;
  }

  cart_empty_text.style.display = "none";
  finalprice.innerHTML = formatCurrency(totalPrice);
  cart_counter.innerHTML = lang === 'ar' ? `عربة التسوق (${c_counter})` : `your cart (${c_counter})`;

  cartItems.forEach(function (item) {
    var cart_item = document.createElement("div");
    cart_item.className = "cart-item";

    cart_item.innerHTML = `
        <img src="${item.imageUrl}" alt="product">
        <div class="item-details">
          <div class="item-name">${item.category || 'Product'}</div>
          <div class="item-price">${formatCurrency(item.price)}</div>
          <div class="item-count">
            <button onclick="update_quantity(${item.index}, -1)">-</button>
            <span>${item.quantity}</span>
            <button onclick="update_quantity(${item.index}, 1)">+</button>
          </div>
        </div>
        <i class="fa-solid fa-trash cart-delete" onclick="remove_from_cart(${item.index})"></i>
      `;

    cart_content.appendChild(cart_item);
  });
}

// ==========================
// Cart Quantity Functions
// ==========================
window.update_quantity = function(index, change) {
  let item = cartItems.find(i => i.index === index);
  if (!item) return;

  if (change < 0 && item.quantity <= 1) {
    window.remove_from_cart(index);
    return;
  }

  item.quantity += change;
  localStorage.setItem('manzili_cart', JSON.stringify(cartItems));
  update_cart_items();
};

window.remove_from_cart = function(index) {
  cartItems = cartItems.filter(i => i.index !== index);
  localStorage.setItem('manzili_cart', JSON.stringify(cartItems));
  update_cart_items();
};

// ==========================
// Upload Logic
// ==========================
function isImageFile(file) {
  return file && file.type && file.type.startsWith("image/");
}

function showFileName(name) {
  if (!fileNameEl) return;
  fileNameEl.style.display = "block";
  fileNameEl.textContent = name;
}

function hideFileName() {
  if (!fileNameEl) return;
  fileNameEl.style.display = "none";
  fileNameEl.textContent = "";
}

// ==========================
// Preview
// ==========================
function showPreview(file) {
  if (!previewImg || !previewWrap) return;
  const reader = new FileReader();

  reader.onload = function (e) {
    previewImg.src = e.target.result;
    previewWrap.classList.add("show");

    localStorage.setItem(SAVED_IMAGE_KEY, e.target.result);
    localStorage.setItem(SAVED_FILE_NAME_KEY, file.name);

    sendImageToAPI(file);
  };

  reader.readAsDataURL(file);
}

function clearPreview() {
  if (!previewImg || !previewWrap) return;
  previewImg.removeAttribute("src");
  previewWrap.classList.remove("show");
}

function restoreSavedPreview() {
  if (!previewImg || !previewWrap) return;
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
if (uploadBtn) {
  uploadBtn.addEventListener("click", () => {
    if (fileInput) fileInput.click();
  });
}

if (fileInput) {
  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    // Reset input so the same file can trigger the change event again
    fileInput.value = "";

    if (!isImageFile(file)) {
      showToast(localStorage.getItem('appLang') === 'ar' ? "يرجى رفع ملف صورة فقط" : "Please upload an image file only");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      const isAr = localStorage.getItem('appLang') === 'ar';
      showToast(isAr ? "حجم الصورة يجب ألا يتجاوز 10 ميجابايت" : "Image size must not exceed 10 MB");
      return;
    }

    showFileName(file.name);
    showPreview(file);
  });
}

// ==========================
// Drag & Drop
// ==========================
if (dropzone) {
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
      showToast(localStorage.getItem('appLang') === 'ar' ? "يرجى سحب صورة فقط" : "Please drop image only");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      const isAr = localStorage.getItem('appLang') === 'ar';
      showToast(isAr ? "حجم الصورة يجب ألا يتجاوز 10 ميجابايت" : "Image size must not exceed 10 MB");
      return;
    }

    showFileName(file.name);
    showPreview(file);
  });
}

// ==========================
// Cart Open / Close
// ==========================
if (cart_icon && cart_section) {
  cart_icon.onclick = function () {
    cart_section.style.display = "block";
  };
}

if (exit_cart_section_mark && cart_section) {
  exit_cart_section_mark.onclick = function () {
    cart_section.style.display = "none";
  };
}

// ==========================
// Checkout Logic
// ==========================
const checkoutBtn = document.querySelector(".checkout-btn");
if (checkoutBtn) {
  checkoutBtn.addEventListener("click", async () => {
    if (cartItems.length === 0) {
      const isAr = localStorage.getItem('appLang') === 'ar';
      if(typeof showToast !== "undefined") {
          showToast(isAr ? "السلة فارغة" : "Cart is empty", "error");
      } else {
          alert(isAr ? "السلة فارغة" : "Cart is empty");
      }
      return;
    }
    
    // Check if user is logged in
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true" || sessionStorage.getItem("isLoggedIn") === "true";
    if (!isLoggedIn) {
       const isAr = localStorage.getItem('appLang') === 'ar';
       if(typeof showToast !== "undefined") showToast(isAr ? "يرجى تسجيل الدخول أولاً" : "Please login first", "error");
       setTimeout(() => { window.location.href = "login.html"; }, 1500);
       return;
    }
    
    // Prepare data
    const payload = {
      items: cartItems.map(item => ({
        imageUrl: item.imageUrl,
        category: item.category || "Product",
        price: item.price || 0,
        quantity: item.quantity || 1
      }))
    };
    
    try {
      checkoutBtn.disabled = true;
      const response = await fetch("http://127.0.0.1:8000/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      if (data.status === "success") {
        const isAr = localStorage.getItem('appLang') === 'ar';
        if(typeof showToast !== "undefined") showToast(isAr ? "تم إتمام الطلب بنجاح" : "Checkout successful", "success");
        cartItems = [];
        localStorage.setItem('manzili_cart', JSON.stringify(cartItems));
        update_cart_items();
        cart_section.style.display = "none";
      } else {
        if(typeof showToast !== "undefined") showToast("Error processing checkout");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      if(typeof showToast !== "undefined") showToast("Server error during checkout");
    } finally {
      checkoutBtn.disabled = false;
    }
  });
}

// ==========================
// Initial State
// ==========================
hideFileName();
clearPreview();
// Only hide results if we are NOT on category page
const urlParams = new URLSearchParams(window.location.search);
if (!urlParams.get('class') && resultsSection) {
  resultsSection.style.display = "none";
}
restoreSavedPreview();
if (!urlParams.get('class') && !window.location.pathname.includes('index.html') && window.location.pathname !== '/' && !window.location.pathname.endsWith('/')) {
  restoreSavedResults();
}
update_cart_items(); // ensure cart is formatted on load

// Search Handlers
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

if (searchInput) {
  searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      sendTextSearch(searchInput.value.trim());
    }
  });
}

if (searchBtn) {
  searchBtn.addEventListener("click", () => {
    if (searchInput) {
      sendTextSearch(searchInput.value.trim());
    }
  });
}

window.addToCart = addToCart;

// ==========================
// Category View Logic (with Pagination)
// ==========================
let currentCategoryPage = 1;

window.loadCategoryImages = async function(categoryId, page = 1) {
  const resultsSection = document.getElementById('resultsSection');
  const resultsGrid = document.getElementById('resultsGrid');
  if (!resultsSection || !resultsGrid) return;
  
  // Hide hero section if exists
  const heroSection = document.querySelector('.hero');
  if (heroSection) heroSection.style.display = 'none';
  
  resultsSection.style.display = 'block';
  
  const lang = localStorage.getItem('appLang') || 'en';
  resultsGrid.innerHTML = `<h2>${lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</h2>`;
  
  const heading = document.querySelector('.results_section h2');
  if (heading) heading.textContent = lang === 'ar' ? 'جاري التحميل...' : 'Loading Category...';

  try {
    const response = await fetch(`http://127.0.0.1:8000/category-images?category=${encodeURIComponent(categoryId)}&page=${page}&limit=10`);
    const data = await response.json();
    
    resultsGrid.innerHTML = '';
    
    // Attempt basic Arabic translation for some categories or just keep English if unknown
    // Or we could have an Arabic mapping dictionary. For now, rely on data.category.
    let categoryTitle = data.category || 'Category';
    if (lang === 'ar') categoryTitle = translateCategory(categoryTitle);
    
    if (heading) heading.textContent = categoryTitle;
    
    const heroTitle = document.getElementById('heroCategoryTitle');
    if (heroTitle) heroTitle.textContent = categoryTitle;
    
    if (data.images && data.images.length > 0) {
      data.images.forEach(imgUrl => {
        const itemPrice = generatePrice(imgUrl);
        let displayCat = formatCategoryName(categoryTitle);
        if (lang === 'ar') displayCat = translateCategory(displayCat);

        resultsGrid.innerHTML += `
          <div class="product_card">
            <img src="${imgUrl}" alt="result" onerror="this.src='images/placeholder.png'">
            <h4>${displayCat}</h4>
            <p>${formatCurrency(itemPrice)}</p>
            <button class="add_cart_btn" onclick="addToCart('${imgUrl}', ${itemPrice}, '${displayCat.replace(/'/g, "\\'")}')">
              ${lang === 'ar' ? 'أضف للسلة' : 'Add to Cart'}
            </button>
          </div>
        `;
      });
      
      renderPagination(categoryId, data.total_pages, data.current_page);
    } else {
      resultsGrid.innerHTML = `<p>${lang === 'ar' ? 'لا توجد صور' : 'No images found'}</p>`;
      renderPagination(categoryId, 0, 1);
    }
  } catch (err) {
    console.error(err);
    resultsGrid.innerHTML = '<p>Error loading category</p>';
  }
};

function renderPagination(categoryId, totalPages, current) {
  let pagination = document.getElementById('paginationContainer');
  if (!pagination) {
    // Create it if it doesn't exist
    const container = document.querySelector('.results_section .container');
    if (!container) return;
    pagination = document.createElement('div');
    pagination.id = 'paginationContainer';
    pagination.className = 'pagination';
    container.appendChild(pagination);
  }
  
  pagination.innerHTML = "";
  if (totalPages <= 1) return;
  
  // Prev Button
  if (current > 1) {
    const prev = document.createElement("button");
    prev.className = "page-btn";
    prev.innerHTML = "<i class='fa-solid fa-chevron-left'></i>";
    prev.onclick = () => loadCategoryImages(categoryId, current - 1);
    pagination.appendChild(prev);
  }
  
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= current - 2 && i <= current + 2)) {
      const btn = document.createElement("button");
      btn.className = `page-btn ${i === current ? 'active' : ''}`;
      btn.textContent = i;
      if (i !== current) {
        btn.onclick = () => loadCategoryImages(categoryId, i);
      }
      pagination.appendChild(btn);
    } else if (i === current - 3 || i === current + 3) {
      const dots = document.createElement("span");
      dots.textContent = "...";
      dots.style.color = document.body.classList.contains("dark-mode") ? "#fff" : "#333";
      pagination.appendChild(dots);
    }
  }
  
  // Next Button
  if (current < totalPages) {
    const next = document.createElement("button");
    next.className = "page-btn";
    next.innerHTML = "<i class='fa-solid fa-chevron-right'></i>";
    next.onclick = () => loadCategoryImages(categoryId, current + 1);
    pagination.appendChild(next);
  }
}

async function populateSidebar(currentClass) {
  const sidebar = document.getElementById('sidebarCategoriesList');
  if (!sidebar) return;
  
  const lang = localStorage.getItem('appLang') || 'en';
  
  try {
    const response = await fetch("http://127.0.0.1:8000/categories");
    const data = await response.json();
    sidebar.innerHTML = "";
    
    data.categories.forEach(cat => {
      const div = document.createElement("div");
      div.className = "sidebar_item";
      
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `sidebar_cat_${cat.id}`;
      checkbox.checked = (cat.id === currentClass);
      
      checkbox.addEventListener("change", (e) => {
        if (e.target.checked) {
          // Uncheck all other checkboxes
          document.querySelectorAll('.sidebar_item input[type="checkbox"]').forEach(cb => {
            if (cb !== e.target) cb.checked = false;
          });
          
          // Update URL without reload
          const newUrl = new URL(window.location);
          newUrl.searchParams.set('class', cat.id);
          window.history.pushState({}, '', newUrl);
          
          // Load images dynamically
          if (window.loadCategoryImages) {
            window.loadCategoryImages(cat.id, 1);
          }
        } else {
          // Prevent unchecking the currently active class
          e.target.checked = true;
        }
      });
      
      const label = document.createElement("label");
      label.htmlFor = checkbox.id;
      let displayCat = formatCategoryName(cat.name);
      label.textContent = lang === 'ar' ? translateCategory(displayCat) : displayCat;
      
      div.appendChild(checkbox);
      div.appendChild(label);
      sidebar.appendChild(div);
    });
    
    // Add search filtering logic
    const searchInput = document.getElementById('sidebarSearch');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        const items = sidebar.querySelectorAll('.sidebar_item');
        items.forEach(item => {
          const txt = item.querySelector('label').textContent.toLowerCase();
          if (txt.includes(val)) {
            item.style.display = 'flex';
          } else {
            item.style.display = 'none';
          }
        });
      });
    }
    
  } catch(err) {
    console.error(err);
    sidebar.innerHTML = `<p>${lang === 'ar' ? 'خطأ في تحميل الفئات' : 'Error loading categories'}</p>`;
  }
}

// Simple dictionary for category translations
function translateCategory(name) {
  const dict = {
    "Bed": "سرير", "Chair": "كرسي", "Table": "طاولة", "Sofas": "كنبة",
    "Carpet": "سجادة", "Television": "تلفزيون", "Refrigerator": "ثلاجة",
    "Microwave": "ميكروويف", "Dishwasher": "غسالة أطباق", "Toaster": "محمصة",
    "Waffle Iron": "صانع وافل", "Vacuum Cleaner": "مكنسة كهربائية",
    "Electric Fan": "مروحة", "Hand Blower": "مجفف هواء", "Coffe Maker": "ماكينة قهوة",
    "Teapot": "إبريق شاي", "Crock Pot": "حلة طهي", "Mixing Bowl": "وعاء خلط",
    "Frying Pan": "مقلاة", "Pitcher": "إبريق", "Salt Shaker": "ملاحة",
    "Cleaver": "ساطور", "Stove": "بوتاجاز", "Wardrobe": "دولاب", "Chiffonier": "تسريحة"
  };
  // Case-insensitive match if possible
  for (let key in dict) {
    if (name.toLowerCase().includes(key.toLowerCase())) return dict[key];
  }
  return name;
}

window.loadBestSellers = async function() {
  const resultsSection = document.getElementById('resultsSection');
  const resultsGrid = document.getElementById('resultsGrid');
  if (!resultsSection || !resultsGrid) return;
  
  // Hide hero section if exists
  const heroSection = document.querySelector('.hero');
  if (heroSection) heroSection.style.display = 'none';
  
  resultsSection.style.display = 'block';
  
  const lang = localStorage.getItem('appLang') || 'en';
  resultsGrid.innerHTML = `<h2>${lang === 'ar' ? 'جاري التحميل...' : 'Loading...'}</h2>`;
  
  const heading = document.querySelector('.results_section h2');
  if (heading) heading.textContent = lang === 'ar' ? 'جاري التحميل...' : 'Loading Best Sellers...';

  try {
    const response = await fetch(`http://127.0.0.1:8000/best-sellers?limit=5`);
    const data = await response.json();
    
    resultsGrid.innerHTML = '';
    
    const titleText = lang === 'ar' ? 'الأكثر مبيعاً' : 'Best Sellers';
    if (heading) heading.textContent = titleText;
    
    const heroTitle = document.getElementById('heroCategoryTitle');
    if (heroTitle) heroTitle.textContent = titleText;
    
    if (data.items && data.items.length > 0) {
      data.items.forEach(item => {
        let displayCat = formatCategoryName(item.category);
        if (lang === 'ar') displayCat = translateCategory(displayCat);

        resultsGrid.innerHTML += `
          <div class="product_card">
            <img src="${item.image}" alt="result" onerror="this.src='images/placeholder.png'">
            <h4>${displayCat}</h4>
            <p>${formatCurrency(item.price)}</p>
            <button class="add_cart_btn" onclick="addToCart('${item.image}', ${item.price}, '${displayCat.replace(/'/g, "\\'")}')">
              ${lang === 'ar' ? 'أضف للسلة' : 'Add to Cart'}
            </button>
          </div>
        `;
      });
      
    } else {
      resultsGrid.innerHTML = `<p>${lang === 'ar' ? 'لا توجد منتجات' : 'No items found'}</p>`;
    }
  } catch (err) {
    console.error(err);
    resultsGrid.innerHTML = '<p>Error loading best sellers</p>';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const categoryId = urlParams.get('class');
  const textQuery = urlParams.get('q');
  
  // Check if we are on best_sellers.html
  if (window.location.pathname.includes('best_sellers.html')) {
    if (window.loadBestSellers) window.loadBestSellers();
  } else if (window.location.pathname.includes('text_search.html')) {
    // Auto-search if ?q is present
    if (textQuery) {
        sendTextSearch(textQuery);
    }
  } else if (categoryId) {
    loadCategoryImages(categoryId, 1);
    populateSidebar(categoryId);
  }
});