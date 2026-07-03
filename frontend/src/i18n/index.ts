import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import ar from './locales/ar.json'

const STORAGE_KEY = 'qa-platform:lang'
const storedLang = localStorage.getItem(STORAGE_KEY)

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ar: { translation: ar },
  },
  lng: storedLang === 'ar' ? 'ar' : 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (lng) => {
  localStorage.setItem(STORAGE_KEY, lng)
  document.documentElement.dir = i18n.dir(lng)
  document.documentElement.lang = lng
})

document.documentElement.dir = i18n.dir(i18n.language)
document.documentElement.lang = i18n.language

export default i18n
