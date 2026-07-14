import { PLANS, ADN_PASTORAL_FIELDS } from './constants.js'

export function canUseFeature(userPlan, featureName) {
  const plan = PLANS[userPlan] || PLANS.free
  return plan.features[featureName] === true
}

export function getUpgradePlan(currentPlan) {
  if (currentPlan === 'free') return 'mensajero'
  if (currentPlan === 'mensajero') return 'proclamador'
  return null
}

// true si el usuario nunca ha guardado ningún campo de su ADN Pastoral (los
// 9 están vacíos/null) — ver AdnPastoralPrompt.jsx. No requiere que profile
// traiga otros campos, solo estos 9.
export function isAdnPastoralEmpty(profile) {
  return ADN_PASTORAL_FIELDS.every((field) => !profile?.[field])
}
