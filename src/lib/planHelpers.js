import { PLANS } from './constants.js'

export function canUseFeature(userPlan, featureName) {
  const plan = PLANS[userPlan] || PLANS.free
  return plan.features[featureName] === true
}

export function getUpgradePlan(currentPlan) {
  if (currentPlan === 'free') return 'mensajero'
  if (currentPlan === 'mensajero') return 'proclamador'
  return null
}
