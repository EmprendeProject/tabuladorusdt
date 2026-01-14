import {
  catalogSettingsRepository,
  CATALOG_TEMPLATES,
  DEFAULT_CATALOG_TEMPLATE,
} from '../data/catalogSettingsRepository'

export { CATALOG_TEMPLATES, DEFAULT_CATALOG_TEMPLATE }

export const fetchCatalogTemplate = async () => {
  return catalogSettingsRepository.fetchTemplate()
}

export const saveCatalogTemplate = async (catalogTemplate) => {
  return catalogSettingsRepository.saveTemplate(catalogTemplate)
}

export const subscribeCatalogTemplate = (onChange) => {
  return catalogSettingsRepository.subscribeTemplate(onChange)
}
