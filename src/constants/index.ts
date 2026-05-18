import { Template } from '../types'
import { RAMADHAN_TEMPLATES } from './templates/ramadhanTemplates'
import { STANDARD_TEMPLATES } from './templates/standardTemplates'
import { VALENTINE_TEMPLATES } from './templates/valentineTemplates'

export const SESSION_DURATION_SECONDS = 600 // 10 minutes


export const EFFECTS = [
  { id: 'none', label: 'Original', class: '' },
  { id: 'bw', label: 'Noir', class: 'grayscale contrast-125 brightness-90' },
  {
    id: 'warm',
    label: 'Golden',
    class: 'sepia-[0.3] contrast-110 brightness-110 saturate-125',
  },
  {
    id: 'vintage',
    label: '1990s',
    class: 'sepia-[0.5] contrast-90 brightness-105 hue-rotate-[-10deg]',
  },
  {
    id: 'cool',
    label: 'Cool',
    class: 'saturate-110 brightness-105 hue-rotate-[15deg]',
  },
  {
    id: 'vivid',
    label: 'Vivid',
    class: 'saturate-150 contrast-110 brightness-105',
  },
  {
    id: 'soft',
    label: 'Soft',
    class: 'brightness-110 contrast-90 saturate-90',
  },
  {
    id: 'dramatic',
    label: 'Drama',
    class: 'contrast-130 brightness-95 saturate-110',
  },
  {
    id: 'faded',
    label: 'Faded',
    class: 'sepia-[0.2] contrast-85 brightness-110 saturate-80',
  },
  {
    id: 'cold',
    label: 'Cold',
    class: 'saturate-90 brightness-100 hue-rotate-[-15deg]',
  },
]

export const EFFECT_CLASSES = EFFECTS.reduce(
  (acc, effect) => {
    acc[effect.id] = effect.class
    return acc
  },
  {} as Record<string, string>,
)

export const TEMPLATES: Template[] = [
  ...STANDARD_TEMPLATES,
  ...RAMADHAN_TEMPLATES,
  ...VALENTINE_TEMPLATES,
]

// Helper function to get template by ID
export const getTemplateById = (id: string): Template | undefined => {
  return TEMPLATES.find((t) => t.id === id)
}

// Helper function to get templates by photo count
export const getTemplatesByPhotoCount = (count: number): Template[] => {
  return TEMPLATES.filter((t) => t.photoCount === count)
}
