/**
 * LockVault Web - Client Application Logic & State Controller
 */

const state = {
    user: null,          // { userId, email }
    masterKey: null,     // CryptoKey AES-GCM (In-memory only)
    authHash: null,      // SHA-256 Auth Hash
    rawVault: [],        // Ciphertext items dari GAS
    decryptedVault: [],  // Plaintext items hasil dekripsi lokal
    activeItemId: null
};

// DOM References
const authScreen = document.getElementById("authScreen");
const vaultScreen = document.getElementById("vaultScreen");
const authHeaderActions = document.getElementById("authHeaderActions");
const userEmailBadge = document.getElementById("userEmailBadge");
const authForm = document.getElementById("authForm");
const tabLogin = document.getElementById("tabLogin");
const tabRegister = document.getElementById("tabRegister");
const btnAuthSubmit = document.getElementById("btnAuthSubmit");
const btnAuthText = document.getElementById("btnAuthText");
const btnToggleAuthPass = document.getElementById("btnToggleAuthPass");
const authPasswordInput = document.getElementById("authPassword");

const listPane = document.getElementById("listPane");
const detailPane = document.getElementById("detailPane");
const itemList = document.getElementById("itemList");
const itemCountBadge = document.getElementById("itemCountBadge");
const emptyView = document.getElementById("emptyView");
const itemForm = document.getElementById("itemForm");
const formTitle = document.getElementById("formTitle");
const btnNewItem = document.getElementById("btnNewItem");
const btnDeleteItem = document.getElementById("btnDeleteItem");
const btnBackToList = document.getElementById("btnBackToList");
const searchInput = document.getElementById("searchInput");

const itemPassword = document.getElementById("itemPassword");
const btnToggleItemPass = document.getElementById("btnToggleItemPass");
const btnQuickGenPass = document.getElementById("btnQuickGenPass");
const btnCopyItemPass = document.getElementById("btnCopyItemPass");
const btnCopyUsername = document.getElementById("btnCopyUsername");
const btnCopyNotes = document.getElementById("btnCopyNotes");
const btnLaunchUrl = document.getElementById("btnLaunchUrl");

let isLoginMode = true;

// --- TOAST NOTIFICATION HELPER ---
function showToast(message, isError = false) {
    const toast = document.getElementById("toast");
    const toastMsg = document.getElementById("toastMsg");
    const toastIcon = document.getElementById("toastIcon");

    toastMsg.innerText = message;
    if (isError) {
        toast.className = "fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-surfaceCard border border-roseDestructive text-white px-4 py-2 rounded-xl text-xs flex items-center space-x-2 shadow-2xl transition-all duration-300 opacity-100 translate-y-0";
        toastIcon.className = "fa-solid fa-circle-exclamation text-roseDestructive";
    } else {
        toast.className = "fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-surfaceCard border border-emeraldAccent text-white px-4 py-2 rounded-xl text-xs flex items-center space-x-2 shadow-2xl transition-all duration-300 opacity-100 translate-y-0";
        toastIcon.className = "fa-solid fa-circle-check text-emeraldBright";
    }

    setTimeout(() => {
        toast.classList.replace("opacity-100", "opacity-0");
        toast.classList.replace("translate-y-0", "translate-y-2");
    }, 2500);
}

// --- AUTH TAB CONTROLS ---
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

btnToggleAuthPass.onclick = () => {
    authPasswordInput.type = authPasswordInput.type === "password" ? "text" : "password";
};

// --- AUTHENTICATION SUBMIT (ZERO-KNOWLEDGE) ---
authForm.onsubmit = async (e) => {
    e.preventDefault();
    const email = document.getElementById("authEmail").value.trim();
    const password = authPasswordInput.value;

    if (password.length < 8) {
        showToast("Master Password minimal 8 karakter", true);
        return;
    }

    btnAuthSubmit.disabled = true;
    btnAuthText.innerText = "Menderivasi Kunci Kriptografi...";

    try {
        // 1. Derivasi lokal via Web Crypto PBKDF2
        const masterKey = await CryptoEngine.deriveMasterKey(password, email);
        const authHash = await CryptoEngine.generateAuthHash(masterKey, password);

        const action = isLoginMode ? "login" : "register";
        const res = await GasBridge.request({ action, email, authHash });

        state.user = res;
        state.masterKey = masterKey;
        state.authHash = authHash;

        showToast(isLoginMode ? "Brankas berhasil dibuka" : "Registrasi berhasil");
        enterVaultView();
        await fetchAndDecryptVault();

    } catch (err) {
        showToast(err.message, true);
    } finally {
        btnAuthSubmit.disabled = false;
        btnAuthText.innerText = isLoginMode ? "Buka Kunci Vault" : "Daftar Akun Baru";
    }
};

function enterVaultView() {
    authScreen.classList.add("hidden");
    vaultScreen.classList.remove("hidden");
    authHeaderActions.classList.remove("hidden");
    userEmailBadge.innerText = state.user.email;
}

// --- FETCH & DECRYPT VAULT DATA ---
async function fetchAndDecryptVault() {
    itemList.innerHTML = `
    <div class="p-4 text-center text-xs text-slate-500 font-mono-secret">
      <i class="fa-solid fa-spinner fa-spin mr-1"></i> Mendekripsi payload di browser...
    </div>
  `;

    try {
        const rawItems = await GasBridge.request({
            action: "getVault",
            userId: state.user.userId,
            authHash: state.authHash
        });

        state.rawVault = rawItems;
        state.decryptedVault = [];

        for (const item of rawItems) {
            const decrypted = await CryptoEngine.decryptData(state.masterKey, item.ciphertext, item.iv);
            if (decrypted) {
                state.decryptedVault.push({
                    id: item.id,
                    title: item.title,
                    data: decrypted,
                    updatedAt: item.updatedAt
                });
            }
        }

        itemCountBadge.innerText = `${state.decryptedVault.length} item tersinkronisasi`;
        renderVaultList(state.decryptedVault);

    } catch (err) {
        showToast("Gagal memuat vault: " + err.message, true);
    }
}

// --- RENDER VAULT LIST ---
function renderVaultList(items) {
    itemList.innerHTML = "";
    if (items.length === 0) {
        itemList.innerHTML = `
      <div class="p-6 text-center text-xs text-slate-500">
        <i class="fa-solid fa-shield-slash text-2xl mb-2 text-slate-600"></i>
        <p>Tidak ada item tersimpan.</p>
      </div>
    `;
        return;
    }

    items.forEach(item => {
        const card = document.createElement("div");
        const isActive = state.activeItemId === item.id;
        card.className = `p-2.5 rounded-lg border border-borderHairline bg-surfaceElevated/50 hover:bg-surfaceElevated cursor-pointer transition flex items-center justify-between ${isActive ? "active-item-indicator" : ""}`;

        card.innerHTML = `
      <div class="flex items-center space-x-2.5 min-w-0">
        <div class="w-8 h-8 rounded-lg bg-canvas border border-borderStandard/60 text-slate-400 flex items-center justify-center font-bold text-xs shrink-0">
          ${escapeHtml(item.title.substring(0, 2).toUpperCase())}
        </div>
        <div class="truncate">
          <div class="font-semibold text-xs text-white truncate">${escapeHtml(item.title)}</div>
          <div class="text-[11px] text-slate-400 font-mono-secret truncate">${escapeHtml(item.data.username || "Tanpa Username")}</div>
        </div>
      </div>
      <button type="button" class="quick-copy-pass text-slate-500 hover:text-emeraldBright p-2" title="Salin Password">
        <i class="fa-regular fa-copy text-xs"></i>
      </button>
    `;

        card.onclick = (e) => {
            if (e.target.closest(".quick-copy-pass")) {
                copyToClipboard(item.data.password, "Password disalin");
                return;
            }
            selectItem(item);
        };

        itemList.appendChild(card);
    });
}

// --- ITEM SELECTION & DETAIL POPULATION ---
function selectItem(item) {
    state.activeItemId = item.id;
    renderVaultList(state.decryptedVault);

    // Responsive switch: di mobile, sembunyikan listPane dan tampilkan detailPane
    if (window.innerWidth < 768) {
        listPane.classList.add("hidden");
        detailPane.classList.remove("hidden");
    }

    emptyView.classList.add("hidden");
    itemForm.classList.remove("hidden");

    document.getElementById("itemId").value = item.id;
    formTitle.innerText = "Detail Kredensial";
    document.getElementById("itemTitle").value = item.title;
    document.getElementById("itemUsername").value = item.data.username || "";
    itemPassword.value = item.data.password || "";
    document.getElementById("itemUrl").value = item.data.url || "";
    document.getElementById("itemNotes").value = item.data.notes || "";
    document.getElementById("metadataDate").innerText = "Diperbarui: " + (item.updatedAt ? new Date(item.updatedAt).toLocaleString("id-ID") : "-");

    updateEntropyUI(item.data.password || "");
}

// Tombol Tambah Baru
btnNewItem.onclick = () => {
    state.activeItemId = null;
    renderVaultList(state.decryptedVault);

    if (window.innerWidth < 768) {
        listPane.classList.add("hidden");
        detailPane.classList.remove("hidden");
    }

    emptyView.classList.add("hidden");
    itemForm.classList.remove("hidden");
    itemForm.reset();

    document.getElementById("itemId").value = "";
    formTitle.innerText = "Tambah Kredensial Baru";
    document.getElementById("metadataDate").innerText = "Item baru (belum disimpan)";
    updateEntropyUI("");
};

// Tombol Kembali (Mobile Viewport)
btnBackToList.onclick = () => {
    detailPane.classList.add("hidden");
    listPane.classList.remove("hidden");
};

// --- SIMPAN ITEM VAULT (ENKRIPSI AES-GCM LOKAL) ---
itemForm.onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById("itemId").value;
    const title = document.getElementById("itemTitle").value.trim();
    const plainPayload = {
        username: document.getElementById("itemUsername").value,
        password: itemPassword.value,
        url: document.getElementById("itemUrl").value,
        notes: document.getElementById("itemNotes").value
    };

    const btnSave = document.getElementById("btnSaveItem");
    btnSave.disabled = true;
    btnSave.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-1"></i> Menyimpan...`;

    try {
        // Enkripsi client-side sebelum payload keluar dari browser
        const encrypted = await CryptoEngine.encryptData(state.masterKey, plainPayload);

        await GasBridge.request({
            action: "saveItem",
            userId: state.user.userId,
            authHash: state.authHash,
            item: {
                id: id || null,
                title: title,
                ciphertext: encrypted.ciphertext,
                iv: encrypted.iv
            }
        });

        showToast("Kredensial berhasil dienkripsi dan disimpan");
        await fetchAndDecryptVault();

        if (window.innerWidth < 768) {
            detailPane.classList.add("hidden");
            listPane.classList.remove("hidden");
        }

    } catch (err) {
        showToast("Gagal menyimpan: " + err.message, true);
    } finally {
        btnSave.disabled = false;
        btnSave.innerHTML = `<i class="fa-solid fa-floppy-disk mr-1"></i> Simpan`;
    }
};

// --- HAPUS ITEM VAULT ---
btnDeleteItem.onclick = async () => {
    const id = document.getElementById("itemId").value;
    if (!id) return;

    if (confirm("Hapus item ini secara permanen dari brankas terenkripsi?")) {
        try {
            await GasBridge.request({
                action: "deleteItem",
                userId: state.user.userId,
                authHash: state.authHash,
                itemId: id
            });

            showToast("Item berhasil dihapus");
            state.activeItemId = null;
            itemForm.classList.add("hidden");
            emptyView.classList.remove("hidden");
            await fetchAndDecryptVault();

            if (window.innerWidth < 768) {
                detailPane.classList.add("hidden");
                listPane.classList.remove("hidden");
            }
        } catch (err) {
            showToast("Gagal menghapus: " + err.message, true);
        }
    }
};

// --- REAL-TIME SEARCH FILTER ---
searchInput.oninput = (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = state.decryptedVault.filter(item => {
        return (
            item.title.toLowerCase().includes(q) ||
            (item.data.username && item.data.username.toLowerCase().includes(q)) ||
            (item.data.url && item.data.url.toLowerCase().includes(q))
        );
    });
    renderVaultList(filtered);
};

// --- PASSWORD UTILITIES & ENTROPY METER ---
itemPassword.oninput = (e) => {
    updateEntropyUI(e.target.value);
};

btnToggleItemPass.onclick = () => {
    itemPassword.type = itemPassword.type === "password" ? "text" : "password";
};

btnQuickGenPass.onclick = () => {
    const generated = CryptoEngine.generateRandomPassword(20, true, true, true, true);
    itemPassword.value = generated;
    itemPassword.type = "text";
    updateEntropyUI(generated);
    showToast("Password acak dibuat!");
};

function updateEntropyUI(pass) {
    const entropy = CryptoEngine.calculateEntropy(pass);
    const text = document.getElementById("entropyText");
    text.innerText = `${entropy} bit entropy`;

    const bars = [
        document.getElementById("entBar1"),
        document.getElementById("entBar2"),
        document.getElementById("entBar3"),
        document.getElementById("entBar4")
    ];

    bars.forEach(b => b.className = "h-1 rounded bg-slate-800 transition-colors");

    if (entropy > 0) bars[0].className = "h-1 rounded bg-roseDestructive";
    if (entropy >= 45) bars[1].className = "h-1 rounded bg-amberWarning";
    if (entropy >= 70) bars[2].className = "h-1 rounded bg-emeraldAccent";
    if (entropy >= 95) bars[3].className = "h-1 rounded bg-emeraldBright shadow-sm shadow-emeraldBright";
}

// --- CLIPBOARD ACTIONS ---
function copyToClipboard(text, successMsg) {
    if (!text) {
        showToast("Data kosong", true);
        return;
    }
    navigator.clipboard.writeText(text).then(() => {
        showToast(successMsg);
    });
}

btnCopyItemPass.onclick = () => copyToClipboard(itemPassword.value, "Password disalin ke clipboard!");
btnCopyUsername.onclick = () => copyToClipboard(document.getElementById("itemUsername").value, "Username disalin!");
btnCopyNotes.onclick = () => copyToClipboard(document.getElementById("itemNotes").value, "Catatan disalin!");

btnLaunchUrl.onclick = () => {
    const url = document.getElementById("itemUrl").value.trim();
    if (url) window.open(url.startsWith("http") ? url : "https://" + url, "_blank");
};

// --- LOGOUT & FLUSH MEMORY ---
document.getElementById("btnLogout").onclick = () => {
    state.user = null;
    state.masterKey = null;
    state.authHash = null;
    state.rawVault = [];
    state.decryptedVault = [];
    location.reload();
};

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, s => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[s]));
}