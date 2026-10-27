/**
 * LockVault Web - v3 Full Feature (Multi-Types, Generator, Health, Settings, Custom Dropdowns)
 */

const state = {
    user: null,
    masterKey: null,
    authHash: null,
    decryptedVault: [],
    folders: ['Default', 'Personal', 'Work', 'Finansial'],
    activeItem: null,
    contextMenuItem: null,
    activeFolderFilter: 'ALL'
};

// Helper Favicon Domain
function getFaviconUrl(url) {
    if (!url) return null;
    try {
        let cleanUrl = url.trim();
        if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
            cleanUrl = 'https://' + cleanUrl;
        }
        const domain = new URL(cleanUrl).hostname;
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch (e) {
        return null;
    }
}

// DOM References
const authScreen = document.getElementById("authScreen");
const mainAppWrapper = document.getElementById("mainAppWrapper");
const bottomNav = document.getElementById("bottomNav");
const authHeaderActions = document.getElementById("authHeaderActions");
const userInitialBadge = document.getElementById("userInitialBadge");
const authForm = document.getElementById("authForm");
const tabLogin = document.getElementById("tabLogin");
const tabRegister = document.getElementById("tabRegister");
const btnAuthSubmit = document.getElementById("btnAuthSubmit");
const btnAuthText = document.getElementById("btnAuthText");

const listPane = document.getElementById("listPane");
const detailPane = document.getElementById("detailPane");
const itemList = document.getElementById("itemList");
const itemCountBadge = document.getElementById("itemCountBadge");
const emptyView = document.getElementById("emptyView");
const itemForm = document.getElementById("itemForm");
const formTitle = document.getElementById("formTitle");
const formFavicon = document.getElementById("formFavicon");
const formTypeIcon = document.getElementById("formTypeIcon");
const btnBackToList = document.getElementById("btnBackToList");
const searchInput = document.getElementById("searchInput");

// Dropdown Folder
const btnFolderDropdown = document.getElementById("btnFolderDropdown");
const folderDropdownMenu = document.getElementById("folderDropdownMenu");
const currentFolderText = document.getElementById("currentFolderText");
const customFolderList = document.getElementById("customFolderList");
const btnManageFolders = document.getElementById("btnManageFolders");

// Form Elements
const itemId = document.getElementById("itemId");
const itemType = document.getElementById("itemType");
const itemTitle = document.getElementById("itemTitle");
const itemUrl = document.getElementById("itemUrl");
const itemUsername = document.getElementById("itemUsername");
const itemPassword = document.getElementById("itemPassword");
const itemNotes = document.getElementById("itemNotes");
const isArchivedState = document.getElementById("isArchivedState");
const btnFormFolderSelect = document.getElementById("btnFormFolderSelect");
const formFolderSelectedText = document.getElementById("formFolderSelectedText");
const formFolderMenu = document.getElementById("formFolderMenu");

const fieldGroupWeb = document.getElementById("fieldGroupWeb");
const fieldGroupPassword = document.getElementById("fieldGroupPassword");
const lblPassword = document.getElementById("lblPassword");

// Add Menu Dropdown
const btnOpenAddMenu = document.getElementById("btnOpenAddMenu");
const addTypeMenu = document.getElementById("addTypeMenu");

// Form Action Buttons
const btnAutofillTop = document.getElementById("btnAutofillTop");
const btnCloneItem = document.getElementById("btnCloneItem");
const btnArchiveToggle = document.getElementById("btnArchiveToggle");
const archiveBtnText = document.getElementById("archiveBtnText");
const btnDeleteItem = document.getElementById("btnDeleteItem");
const btnSaveItem = document.getElementById("btnSaveItem");

// Context Menu (⋮)
const itemContextMenu = document.getElementById("itemContextMenu");

let isLoginMode = true;

// Toast Helper
function showToast(message, isError = false) {
    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toastMsg");
    const toastIcon = document.getElementById("toastIcon");

    toastMsg.innerText = message;
    toast.className = isError
        ? "fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-surfaceCard border border-roseDestructive text-white px-4 py-2 rounded-xl text-xs flex items-center space-x-2 shadow-2xl transition-all duration-300 opacity-100 translate-y-0"
        : "fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-surfaceCard border border-emeraldAccent text-white px-4 py-2 rounded-xl text-xs flex items-center space-x-2 shadow-2xl transition-all duration-300 opacity-100 translate-y-0";

    toastIcon.className = isError ? "fa-solid fa-circle-exclamation text-roseDestructive" : "fa-solid fa-circle-check text-emeraldBright";

    setTimeout(() => {
        toast.classList.replace("opacity-100", "opacity-0");
        toast.classList.replace("translate-y-0", "translate-y-2");
    }, 2500);
}

// Auth Tabs
tabLogin.onclick = () => {
    isLoginMode = true;
    tabLogin.className = "flex-1 py-1.5 text-xs font-semibold rounded-md bg-emeraldAccent text-slate-950 transition";
    tabRegister.className = "flex-1 py-1.5 text-xs font-semibold rounded-md text-slate-400 hover:text-white transition";
    btnAuthText.innerText = "Buka Kunci Vault";
};

tabRegister.onclick = () => {
    isLoginMode = false;
    tabRegister.className = "flex-1 py-1.5 text-xs font-semibold rounded-md bg-emeraldAccent text-slate-950 transition";
    tabLogin.className = "flex-1 py-1.5 text-xs font-semibold rounded-md text-slate-400 hover:text-white transition";
    btnAuthText.innerText = "Daftar Akun Baru";
};

// Auth Submit
authForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;

    btnAuthSubmit.disabled = true;
    btnAuthText.innerText = "Menderivasi Kunci PBKDF2...";

    try {
        const masterKey = await CryptoEngine.deriveMasterKey(password, email);
        const authHash = await CryptoEngine.generateAuthHash(masterKey, password);

        const action = isLoginMode ? "login" : "register";
        const res = await GasBridge.request({ action, email, authHash });

        state.user = res;
        state.masterKey = masterKey;
        state.authHash = authHash;

        userInitialBadge.innerText = email.substring(0, 2).toUpperCase();

        authScreen.classList.add("hidden");
        mainAppWrapper.classList.remove("hidden");
        bottomNav.classList.remove("hidden");
        authHeaderActions.classList.remove("hidden");

        await fetchAndDecryptVault();
        initGenerator();
    } catch (err) {
        showToast(err.message, true);
    } finally {
        btnAuthSubmit.disabled = false;
        btnAuthText.innerText = isLoginMode ? "Buka Kunci Vault" : "Daftar Akun Baru";
    }
};

// Fetch Vault
async function fetchAndDecryptVault() {
    itemList.innerHTML = `
    <div class="p-6 text-center text-xs text-slate-500 font-mono">
      <i class="fa-solid fa-spinner fa-spin mr-1"></i> Mendekripsi data vault...
    </div>
  `;

    try {
        const rawItems = await GasBridge.request({
            action: "getVault",
            userId: state.user.userId,
            authHash: state.authHash
        });

        state.decryptedVault = [];
        const discoveredFolders = new Set(['Default', 'Personal', 'Work', 'Finansial']);

        for (const item of rawItems) {
            const decrypted = await CryptoEngine.decryptData(state.masterKey, item.ciphertext, item.iv);
            if (decrypted) {
                const folder = item.folder || 'Default';
                discoveredFolders.add(folder);
                state.decryptedVault.push({
                    id: item.id,
                    title: item.title,
                    folder: folder,
                    isArchived: item.isArchived === true,
                    data: decrypted,
                    updatedAt: item.updatedAt
                });
            }
        }

        state.folders = Array.from(discoveredFolders);
        renderFolderDropdownUI();
        renderFilteredVault();
    } catch (err) {
        showToast("Gagal memuat vault: " + err.message, true);
    }
}

// Render Folder Dropdowns
function renderFolderDropdownUI() {
    // 1. Filter Dropdown di Panel Kiri
    customFolderList.innerHTML = "";
    state.folders.forEach(folder => {
        const btn = document.createElement("button");
        btn.className = "folder-option w-full text-left px-3 py-2 text-xs hover:bg-surfaceElevated flex items-center justify-between text-slate-200";
        btn.dataset.folder = folder;
        btn.innerHTML = `<span>${escapeHtml(folder)}</span>`;
        customFolderList.appendChild(btn);
    });

    // 2. Form Dropdown di Panel Editor
    formFolderMenu.innerHTML = "";
    state.folders.forEach(folder => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "w-full text-left px-3 py-2 text-xs hover:bg-surfaceElevated text-slate-200";
        btn.innerText = folder;
        btn.onclick = () => {
            formFolderSelectedText.innerText = folder;
            formFolderMenu.classList.add("hidden");
        };
        formFolderMenu.appendChild(btn);
    });
}

// Toggle Dropdown Filter Folder
btnFolderDropdown.onclick = (e) => {
    e.stopPropagation();
    folderDropdownMenu.classList.toggle("hidden");
};
btnFormFolderSelect.onclick = (e) => {
    e.stopPropagation();
    formFolderMenu.classList.toggle("hidden");
};

// Event Delegasi Folder Selection
folderDropdownMenu.onclick = (e) => {
    const opt = e.target.closest(".folder-option");
    if (!opt) return;
    state.activeFolderFilter = opt.dataset.folder;
    currentFolderText.innerText = opt.innerText.trim();
    folderDropdownMenu.classList.add("hidden");
    renderFilteredVault();
};

// Tambah Folder Baru
btnManageFolders.onclick = () => {
    const name = prompt("Masukkan nama direktori/folder baru:");
    if (name && name.trim()) {
        const clean = name.trim();
        if (!state.folders.includes(clean)) {
            state.folders.push(clean);
            renderFolderDropdownUI();
            showToast(`Folder "${clean}" ditambahkan!`);
        }
    }
};

// Render Filtered Vault List
function renderFilteredVault() {
    const query = searchInput.value.toLowerCase().trim();
    const filter = state.activeFolderFilter;

    const filtered = state.decryptedVault.filter(item => {
        if (filter === "ARCHIVED") {
            if (!item.isArchived) return false;
        } else {
            if (item.isArchived) return false;
            if (filter !== "ALL" && item.folder.toLowerCase() !== filter.toLowerCase()) return false;
        }

        if (!query) return true;
        return (
            item.title.toLowerCase().includes(query) ||
            (item.data.username && item.data.username.toLowerCase().includes(query)) ||
            (item.data.url && item.data.url.toLowerCase().includes(query)) ||
            (item.folder && item.folder.toLowerCase().includes(query))
        );
    });

    itemCountBadge.innerText = filtered.length;
    renderVaultList(filtered);
}

// Render Item Cards
function renderVaultList(items) {
    itemList.innerHTML = "";
    if (items.length === 0) {
        itemList.innerHTML = `
      <div class="p-8 text-center text-xs text-slate-500">
        <i class="fa-solid fa-box-open text-2xl mb-2 text-slate-600"></i>
        <p>Tidak ada item di kategori ini.</p>
      </div>
    `;
        return;
    }

    items.forEach(item => {
        const card = document.createElement("div");
        const isActive = state.activeItem && state.activeItem.id === item.id;
        const type = item.data.type || 'login';
        const favicon = getFaviconUrl(item.data.url);

        card.className = `p-2.5 rounded-xl border border-borderHairline bg-surfaceCard hover:bg-surfaceElevated cursor-pointer transition flex items-center justify-between group ${isActive ? "border-emeraldAccent/60 bg-surfaceElevated" : ""}`;

        // Tentukan Ikon Tipe
        let iconHtml = '';
        if (favicon && type === 'login') {
            iconHtml = `<img src="${favicon}" onerror="this.src=''; this.className='hidden';" alt="" class="w-7 h-7 rounded-lg object-contain bg-canvas p-1 border border-borderHairline">`;
        } else {
            let iconClass = 'fa-solid fa-globe text-skyAction';
            if (type === 'card') iconClass = 'fa-regular fa-credit-card text-emeraldBright';
            if (type === 'identity') iconClass = 'fa-regular fa-id-card text-amberWarning';
            if (type === 'note') iconClass = 'fa-regular fa-note-sticky text-purple-400';
            if (type === 'ssh') iconClass = 'fa-solid fa-key text-rose-400';

            iconHtml = `<div class="w-7 h-7 rounded-lg bg-canvas border border-borderStandard/60 flex items-center justify-center text-xs"><i class="${iconClass}"></i></div>`;
        }

        card.innerHTML = `
      <div class="flex items-center space-x-3 min-w-0 flex-1">
        ${iconHtml}
        <div class="truncate flex-1">
          <div class="font-semibold text-xs text-white truncate flex items-center gap-1.5">
            ${escapeHtml(item.title)}
            ${item.isArchived ? '<span class="text-[9px] bg-amberWarning/20 text-amberWarning px-1 rounded">Arsip</span>' : ''}
          </div>
          <div class="text-[11px] text-slate-400 font-mono truncate">${escapeHtml(item.data.username || item.data.url || item.folder || "Tanpa Username")}</div>
        </div>
      </div>
      <div class="flex items-center space-x-1 pl-2">
        <button type="button" class="btn-quick-copy text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-canvas transition" title="Salin">
          <i class="fa-regular fa-copy text-xs"></i>
        </button>
        <button type="button" class="btn-card-menu text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-canvas transition" title="Menu Opsi">
          <i class="fa-solid fa-ellipsis-vertical text-xs"></i>
        </button>
      </div>
    `;

        card.onclick = (e) => {
            if (e.target.closest(".btn-quick-copy")) {
                copyToClipboard(item.data.password || item.data.notes || item.data.username, "Data disalin ke clipboard!");
                return;
            }
            if (e.target.closest(".btn-card-menu")) {
                openContextMenu(e, item);
                return;
            }
            openItemDetail(item, false);
        };

        itemList.appendChild(card);
    });
}

// Buka Item di Panel Detail
function openItemDetail(item, isReadOnly = false) {
    state.activeItem = item;
    renderFilteredVault();

    if (window.innerWidth < 768) {
        listPane.classList.add("hidden");
        detailPane.classList.remove("hidden");
    }

    emptyView.classList.add("hidden");
    itemForm.classList.remove("hidden");

    itemId.value = item.id;
    const type = item.data.type || 'login';
    itemType.value = type;
    isArchivedState.value = item.isArchived ? "true" : "false";

    formTitle.innerText = isReadOnly ? `View (${type.toUpperCase()})` : `Edit (${type.toUpperCase()})`;
    itemTitle.value = item.title;
    formFolderSelectedText.innerText = item.folder || "Default";
    itemUrl.value = item.data.url || "";
    itemUsername.value = item.data.username || "";
    itemPassword.value = item.data.password || "";
    itemNotes.value = item.data.notes || "";

    archiveBtnText.innerText = item.isArchived ? "Buka Arsip" : "Arsipkan";
    adjustFormFieldsForType(type);

    const favicon = getFaviconUrl(item.data.url);
    if (favicon && type === 'login') {
        formFavicon.src = favicon;
        formFavicon.classList.remove("hidden");
        formTypeIcon.classList.add("hidden");
    }

    document.getElementById("metadataDate").innerText = "Diperbarui: " + (item.updatedAt ? new Date(item.updatedAt).toLocaleString("id-ID") : "-");
    updateEntropyUI(item.data.password || "");
}

// Atur field form sesuai tipe (Login, Card, Note, etc.)
function adjustFormFieldsForType(type) {
    formFavicon.classList.add("hidden");
    formTypeIcon.classList.remove("hidden");

    if (type === 'login') {
        fieldGroupWeb.classList.remove("hidden");
        fieldGroupPassword.classList.remove("hidden");
        lblPassword.innerText = "Password";
        formTypeIcon.className = "fa-solid fa-globe text-skyAction";
    } else if (type === 'card') {
        fieldGroupWeb.classList.add("hidden");
        fieldGroupPassword.classList.remove("hidden");
        lblPassword.innerText = "PIN / CVV";
        formTypeIcon.className = "fa-regular fa-credit-card text-emeraldBright";
    } else if (type === 'identity') {
        fieldGroupWeb.classList.add("hidden");
        fieldGroupPassword.classList.add("hidden");
        formTypeIcon.className = "fa-regular fa-id-card text-amberWarning";
    } else if (type === 'note') {
        fieldGroupWeb.classList.add("hidden");
        fieldGroupPassword.classList.add("hidden");
        formTypeIcon.className = "fa-regular fa-note-sticky text-purple-400";
    } else if (type === 'ssh') {
        fieldGroupWeb.classList.add("hidden");
        fieldGroupPassword.classList.remove("hidden");
        lblPassword.innerText = "Passphrase Key";
        formTypeIcon.className = "fa-solid fa-key text-rose-400";
    }
}

// Menu Dropdown Tambah (+)
btnOpenAddMenu.onclick = (e) => {
    e.stopPropagation();
    addTypeMenu.classList.toggle("hidden");
};

// Klik Opsi Tipe Tambah Data
document.querySelectorAll(".add-type-btn").forEach(btn => {
    btn.onclick = () => {
        const type = btn.dataset.type;
        addTypeMenu.classList.add("hidden");

        if (type === "folder") {
            btnManageFolders.click();
            return;
        }

        state.activeItem = null;
        renderFilteredVault();

        if (window.innerWidth < 768) {
            listPane.classList.add("hidden");
            detailPane.classList.remove("hidden");
        }

        emptyView.classList.add("hidden");
        itemForm.classList.remove("hidden");
        itemForm.reset();

        itemId.value = "";
        itemType.value = type;
        isArchivedState.value = "false";
        formTitle.innerText = `Tambah Data ${type.toUpperCase()}`;
        formFolderSelectedText.innerText = state.activeFolderFilter !== "ALL" && state.activeFolderFilter !== "ARCHIVED" ? state.activeFolderFilter : "Default";
        document.getElementById("metadataDate").innerText = "Item baru";

        adjustFormFieldsForType(type);
        updateEntropyUI("");
    };
});

// Save Item Form
itemForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = itemId.value;
    const title = itemTitle.value.trim();
    const folder = formFolderSelectedText.innerText.trim() || "Default";
    const type = itemType.value;
    const isArchived = isArchivedState.value === "true";

    const plainPayload = {
        type: type,
        username: itemUsername.value,
        password: itemPassword.value,
        url: itemUrl.value,
        notes: itemNotes.value
    };

    btnSaveItem.disabled = true;
    btnSaveItem.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;

    try {
        const encrypted = await CryptoEngine.encryptData(state.masterKey, plainPayload);

        await GasBridge.request({
            action: "saveItem",
            userId: state.user.userId,
            authHash: state.authHash,
            item: {
                id: id || null,
                title: title,
                folder: folder,
                isArchived: isArchived,
                ciphertext: encrypted.ciphertext,
                iv: encrypted.iv
            }
        });

        showToast("Data berhasil dienkripsi dan disimpan!");
        await fetchAndDecryptVault();

        if (window.innerWidth < 768) {
            detailPane.classList.add("hidden");
            listPane.classList.remove("hidden");
        }
    } catch (err) {
        showToast("Gagal menyimpan: " + err.message, true);
    } finally {
        btnSaveItem.disabled = false;
        btnSaveItem.innerText = "Simpan";
    }
};

// Autofill & Portal Launcher
function triggerAutofill(item) {
    if (!item || !item.data) return;
    if (item.data.password) {
        copyToClipboard(item.data.password, "Password disalin! Membuka portal...");
    }
    if (item.data.url) {
        let target = item.data.url.trim();
        if (!target.startsWith('http://') && !target.startsWith('https://')) {
            target = 'https://' + target;
        }
        window.open(target, '_blank');
    } else {
        showToast("URL tidak tersedia pada item ini.", true);
    }
}
btnAutofillTop.onclick = () => triggerAutofill(state.activeItem);

// Clone
btnCloneItem.onclick = async () => {
    if (!state.activeItem) return;
    try {
        showToast("Menduplikasi item...");
        const encrypted = await CryptoEngine.encryptData(state.masterKey, state.activeItem.data);

        await GasBridge.request({
            action: "saveItem",
            userId: state.user.userId,
            authHash: state.authHash,
            item: {
                id: null,
                title: state.activeItem.title + " (Copy)",
                folder: state.activeItem.folder,
                isArchived: false,
                ciphertext: encrypted.ciphertext,
                iv: encrypted.iv
            }
        });

        showToast("Item berhasil digandakan!");
        await fetchAndDecryptVault();
    } catch (err) {
        showToast("Gagal clone: " + err.message, true);
    }
};

// Archive Toggle
btnArchiveToggle.onclick = async () => {
    if (!state.activeItem) return;
    const targetArchived = !state.activeItem.isArchived;

    try {
        await GasBridge.request({
            action: "archiveItem",
            userId: state.user.userId,
            authHash: state.authHash,
            itemId: state.activeItem.id,
            isArchived: targetArchived
        });

        showToast(targetArchived ? "Item dipindahkan ke arsip." : "Item dikembalikan dari arsip.");
        await fetchAndDecryptVault();
        itemForm.classList.add("hidden");
        emptyView.classList.remove("hidden");
    } catch (err) {
        showToast("Gagal mengubah arsip: " + err.message, true);
    }
};

// Delete
btnDeleteItem.onclick = async () => {
    if (!state.activeItem) return;
    if (confirm(`Hapus "${state.activeItem.title}" secara permanen?`)) {
        try {
            await GasBridge.request({
                action: "deleteItem",
                userId: state.user.userId,
                authHash: state.authHash,
                itemId: state.activeItem.id
            });

            showToast("Item dihapus permanen.");
            state.activeItem = null;
            itemForm.classList.add("hidden");
            emptyView.classList.remove("hidden");
            await fetchAndDecryptVault();
        } catch (err) {
            showToast("Gagal menghapus: " + err.message, true);
        }
    }
};

// Context Menu (⋮)
function openContextMenu(event, item) {
    event.stopPropagation();
    state.contextMenuItem = item;
    document.getElementById("menuArchiveText").innerText = item.isArchived ? "Unarchive" : "Archive";

    const x = Math.min(event.clientX, window.innerWidth - 180);
    const y = Math.min(event.clientY, window.innerHeight - 240);

    itemContextMenu.style.left = `${x}px`;
    itemContextMenu.style.top = `${y}px`;
    itemContextMenu.classList.remove("hidden");
}

document.getElementById("menuActionAutofill").onclick = () => triggerAutofill(state.contextMenuItem);
document.getElementById("menuActionView").onclick = () => openItemDetail(state.contextMenuItem, true);
document.getElementById("menuActionEdit").onclick = () => openItemDetail(state.contextMenuItem, false);
document.getElementById("menuActionClone").onclick = () => {
    state.activeItem = state.contextMenuItem;
    btnCloneItem.click();
};
document.getElementById("menuActionArchive").onclick = () => {
    state.activeItem = state.contextMenuItem;
    btnArchiveToggle.click();
};
document.getElementById("menuActionDelete").onclick = () => {
    state.activeItem = state.contextMenuItem;
    btnDeleteItem.click();
};

// Global Click Dismiss
window.addEventListener("click", () => {
    itemContextMenu.classList.add("hidden");
    addTypeMenu.classList.add("hidden");
    folderDropdownMenu.classList.add("hidden");
    formFolderMenu.classList.add("hidden");
});

// --- BOTTOM NAVIGATION LOGIC ---
document.querySelectorAll(".nav-tab-btn").forEach(btn => {
    btn.onclick = () => {
        const target = btn.dataset.target;
        document.querySelectorAll(".nav-tab-btn").forEach(b => {
            b.className = "nav-tab-btn flex flex-col items-center text-slate-400 hover:text-white";
        });
        btn.className = "nav-tab-btn flex flex-col items-center text-skyAction";

        document.getElementById("sectionVault").classList.add("hidden");
        document.getElementById("sectionGenerator").classList.add("hidden");
        document.getElementById("sectionHealth").classList.add("hidden");
        document.getElementById("sectionSettings").classList.add("hidden");

        document.getElementById(target).classList.remove("hidden");
        if (target === "sectionHealth") scanVaultHealth();
    };
});

// --- GENERATOR TAB ENGINE ---
const genResultText = document.getElementById("genResultText");
const genLengthSlider = document.getElementById("genLengthSlider");
const genLengthDisplay = document.getElementById("genLengthDisplay");
const btnRegenerate = document.getElementById("btnRegenerate");
const btnCopyGenResult = document.getElementById("btnCopyGenResult");

let currentGenType = 'password';

function initGenerator() {
    generateOutput();
}

function generateOutput() {
    const len = parseInt(genLengthSlider.value);
    genLengthDisplay.innerText = len;

    if (currentGenType === 'password') {
        const u = document.getElementById("chkUpper").checked;
        const l = document.getElementById("chkLower").checked;
        const n = document.getElementById("chkNumbers").checked;
        const s = document.getElementById("chkSymbols").checked;
        genResultText.innerText = CryptoEngine.generateRandomPassword(len, u, l, n, s);
    } else if (currentGenType === 'passphrase') {
        const words = ["kucing", "langit", "bintang", "pohon", "ombak", "garuda", "samudra", "lentera", "kristal", "kopi", "hujan", "mentari", "senja"];
        let phrase = [];
        for (let i = 0; i < 4; i++) {
            phrase.push(words[Math.floor(Math.random() * words.length)]);
        }
        genResultText.innerText = phrase.join("-");
    } else {
        const adjectives = ["swift", "silent", "crypto", "shadow", "iron", "cyber", "shield"];
        const nouns = ["hawk", "fox", "vault", "guard", "node", "matrix"];
        const rndNum = Math.floor(100 + Math.random() * 900);
        genResultText.innerText = `${adjectives[Math.floor(Math.random() * adjectives.length)]}_${nouns[Math.floor(Math.random() * nouns.length)]}${rndNum}`;
    }
}

genLengthSlider.oninput = generateOutput;
document.querySelectorAll("#chkUpper, #chkLower, #chkNumbers, #chkSymbols").forEach(c => c.onchange = generateOutput);
btnRegenerate.onclick = generateOutput;
btnCopyGenResult.onclick = () => copyToClipboard(genResultText.innerText, "Hasil generator disalin!");

document.getElementById("genTypePass").onclick = () => {
    currentGenType = 'password';
    document.getElementById("genTypePass").className = "flex-1 py-1.5 text-xs font-semibold rounded-lg bg-skyAction text-slate-950 transition";
    document.getElementById("genTypePassphrase").className = "flex-1 py-1.5 text-xs font-semibold rounded-lg text-slate-400 hover:text-white transition";
    document.getElementById("genTypeUsername").className = "flex-1 py-1.5 text-xs font-semibold rounded-lg text-slate-400 hover:text-white transition";
    generateOutput();
};
document.getElementById("genTypePassphrase").onclick = () => {
    currentGenType = 'passphrase';
    document.getElementById("genTypePassphrase").className = "flex-1 py-1.5 text-xs font-semibold rounded-lg bg-skyAction text-slate-950 transition";
    document.getElementById("genTypePass").className = "flex-1 py-1.5 text-xs font-semibold rounded-lg text-slate-400 hover:text-white transition";
    document.getElementById("genTypeUsername").className = "flex-1 py-1.5 text-xs font-semibold rounded-lg text-slate-400 hover:text-white transition";
    generateOutput();
};
document.getElementById("genTypeUsername").onclick = () => {
    currentGenType = 'username';
    document.getElementById("genTypeUsername").className = "flex-1 py-1.5 text-xs font-semibold rounded-lg bg-skyAction text-slate-950 transition";
    document.getElementById("genTypePass").className = "flex-1 py-1.5 text-xs font-semibold rounded-lg text-slate-400 hover:text-white transition";
    document.getElementById("genTypePassphrase").className = "flex-1 py-1.5 text-xs font-semibold rounded-lg text-slate-400 hover:text-white transition";
    generateOutput();
};

// --- HEALTH TAB SCAN ENGINE ---
function scanVaultHealth() {
    let weak = 0;
    let passMap = {};
    let reused = 0;

    state.decryptedVault.forEach(item => {
        const pass = item.data.password;
        if (pass) {
            const ent = CryptoEngine.calculateEntropy(pass);
            if (ent < 50) weak++;

            if (passMap[pass]) {
                passMap[pass]++;
            } else {
                passMap[pass] = 1;
            }
        }
    });

    for (let p in passMap) {
        if (passMap[p] > 1) {
            reused += passMap[p];
        }
    }

    document.getElementById("healthWeakCount").innerText = weak;
    document.getElementById("healthReusedCount").innerText = reused;
    document.getElementById("healthTotalCount").innerText = state.decryptedVault.length;
}
document.getElementById("btnScanVault").onclick = () => {
    scanVaultHealth();
    showToast("Audit kesehatan brankas selesai!");
};

// --- SETTINGS TAB ACTIONS ---
document.getElementById("btnExportEncrypted").onclick = () => {
    if (state.decryptedVault.length === 0) return showToast("Brankas kosong", true);
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.decryptedVault, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `lockvault_export_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("File backup terunduh!");
};

document.getElementById("btnPurgeLocalMemory").onclick = () => {
    document.getElementById("btnLogout").click();
};

// Copy & Entropy Utilities
function copyToClipboard(text, msg) {
    if (!text) return showToast("Data kosong", true);
    navigator.clipboard.writeText(text).then(() => showToast(msg));
}

document.getElementById("btnCopyUsername").onclick = () => copyToClipboard(itemUsername.value, "Username disalin!");
document.getElementById("btnCopyItemPass").onclick = () => copyToClipboard(itemPassword.value, "Password disalin!");
document.getElementById("btnToggleItemPass").onclick = () => {
    itemPassword.type = itemPassword.type === "password" ? "text" : "password";
};
document.getElementById("btnGenPass").onclick = () => {
    const p = CryptoEngine.generateRandomPassword(18, true, true, true, true);
    itemPassword.value = p;
    itemPassword.type = "text";
    updateEntropyUI(p);
    showToast("Password acak dibuat!");
};
itemPassword.oninput = (e) => updateEntropyUI(e.target.value);

function updateEntropyUI(pass) {
    const entropy = CryptoEngine.calculateEntropy(pass);
    document.getElementById("entropyText").innerText = `${entropy} bit entropy`;
    const bars = [document.getElementById("entBar1"), document.getElementById("entBar2"), document.getElementById("entBar3"), document.getElementById("entBar4")];
    bars.forEach(b => b.className = "h-1 rounded bg-slate-800 transition-colors");
    if (entropy > 0) bars[0].className = "h-1 rounded bg-roseDestructive";
    if (entropy >= 45) bars[1].className = "h-1 rounded bg-amberWarning";
    if (entropy >= 70) bars[2].className = "h-1 rounded bg-emeraldAccent";
    if (entropy >= 95) bars[3].className = "h-1 rounded bg-emeraldBright";
}

btnBackToList.onclick = () => {
    detailPane.classList.add("hidden");
    listPane.classList.remove("hidden");
};

searchInput.oninput = renderFilteredVault;

document.getElementById("btnLogout").onclick = () => {
    state.user = null;
    state.masterKey = null;
    state.authHash = null;
    state.decryptedVault = [];
    location.reload();
};

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[s]));
}