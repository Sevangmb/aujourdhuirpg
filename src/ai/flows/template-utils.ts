/**
 * @fileOverview Utilitaires pour le remplacement des templates avec placeholders
 */

/**
 * Accède à une propriété imbriquée d'un objet en utilisant une notation pointée
 * Ex: getNestedProperty(player, 'currentLocation.name') 
 */
function getNestedProperty(obj: any, path: string): any {
  return path.split('.').reduce((current, property) => {
    return current && current[property] !== undefined ? current[property] : undefined;
  }, obj);
}

/**
 * Remplace tous les placeholders de type {{{path}}} dans un template
 * avec les valeurs correspondantes de l'objet de données
 */
export function replaceTemplatePlaceholders(template: string, data: any): string {
  // Regex pour matcher {{{...}}} (triple accolades)
  return template.replace(/\{\{\{([^}]+)\}\}\}/g, (match, path) => {
    const value = getNestedProperty(data, path.trim());
    
    // Gestion des différents types de valeurs
    if (value === undefined || value === null) {
      console.warn(`Template placeholder not found: ${path}`);
      return `[${path}]`; // Fallback visible pour debug
    }
    
    if (Array.isArray(value)) {
      return value.join(', ');
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  });
}

/**
 * Valide qu'un texte ne contient plus de placeholders non résolus
 */
export function validateTemplateResolution(text: string): boolean {
  const unresolved = text.match(/\{\{\{[^}]+\}\}\}/g);
  if (unresolved) {
    console.error('Placeholders non résolus détectés:', unresolved);
    return false;
  }
  return true;
}

/**
 * Version sécurisée qui remplace les placeholders ET valide le résultat
 */
export function safeReplaceTemplate(template: string, data: any): string {
  const result = replaceTemplatePlaceholders(template, data);
  
  if (!validateTemplateResolution(result)) {
    console.error('Template avec placeholders non résolus:', template);
    // Retourne une version nettoyée plutôt que de faire planter
    return result.replace(/\{\{\{[^}]+\}\}\}/g, '[données manquantes]');
  }
  
  return result;
}