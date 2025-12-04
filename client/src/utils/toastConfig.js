import { toast } from 'react-toastify';

// Re-export toast for convenience
export { toast };

// Toast konfigurációs beállítások
export const toastConfig = {
  position: "top-right",
  autoClose: 3000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: "colored",
};

// Egyedi toast funkciók
export const showToast = {
  success: (message, options = {}) => {
    toast.success(message, { ...toastConfig, ...options });
  },
  
  error: (message, options = {}) => {
    toast.error(message, { ...toastConfig, ...options });
  },
  
  warning: (message, options = {}) => {
    toast.warning(message, { ...toastConfig, ...options });
  },
  
  info: (message, options = {}) => {
    toast.info(message, { ...toastConfig, ...options });
  },
  
  promise: async (promise, messages, options = {}) => {
    return toast.promise(
      promise,
      {
        pending: messages.pending || 'Feldolgozás...',
        success: messages.success || 'Sikeres!',
        error: messages.error || 'Hiba történt!'
      },
      { ...toastConfig, ...options }
    );
  }
};

// Gyakori üzenetek
export const toastMessages = {
  // Termék műveletek
  productAdded: 'Termék sikeresen hozzáadva! ✅',
  productUpdated: 'Termék sikeresen frissítve! ✅',
  productDeleted: 'Termék sikeresen törölve! 🗑️',
  productError: 'Hiba történt a művelet során! ❌',
  
  // Bevásárlólista
  itemAddedToList: 'Termék hozzáadva a bevásárlólistához! 🛒',
  itemPurchased: 'Termék megvásárolva! ✅',
  listCleared: 'Bevásárlólista törölve! 🗑️',
  
  // Receptek
  recipeAdded: 'Recept sikeresen mentve! 📝',
  recipeDeleted: 'Recept törölve! 🗑️',
  recipeShared: 'Recept megosztva! 🔗',
  
  // Közművek
  utilityAdded: 'Mérőóra állás rögzítve! ⚡',
  utilityUpdated: 'Adatok frissítve! ✅',
  
  // Általános
  saveSuccess: 'Mentés sikeres! ✅',
  saveError: 'Mentési hiba! ❌',
  loadError: 'Betöltési hiba! ❌',
  networkError: 'Hálózati hiba! Ellenőrizd az internetkapcsolatot! 📡',
  
  // Bejelentkezés
  loginSuccess: 'Sikeres bejelentkezés! 👋',
  logoutSuccess: 'Sikeres kijelentkezés! 👋',
  loginError: 'Bejelentkezési hiba! ❌',
  
  // Validáció
  requiredFields: 'Kérlek töltsd ki az összes kötelező mezőt! ⚠️',
  invalidData: 'Érvénytelen adatok! ⚠️',
};

export default showToast;
