import type { Database } from '@/lib/supabase/types'

export type PipelineStage = Database['public']['Enums']['pipeline_stage']
export type PipelineStatus = Database['public']['Enums']['pipeline_status']
export type CommType = Database['public']['Enums']['comm_type']
export type EnergyLevel = Database['public']['Enums']['energy_level']
export type RedFlagSeverity = Database['public']['Enums']['red_flag_severity']
export type RedFlagStatus = Database['public']['Enums']['red_flag_status']
export type RedFlagSource = Database['public']['Enums']['red_flag_source']
export type QuestionStage = Database['public']['Enums']['question_stage']
export type QuestionSource = Database['public']['Enums']['question_source']
export type PriorityFactor = Database['public']['Enums']['priority_factor']

export type QuestionAskedInput = { question: string; answer: string; redFlagIdentified: boolean }

export const RED_FLAG_SEVERITIES: RedFlagSeverity[] = ['low', 'medium', 'high']

export const QUESTION_STAGE_LABELS: Record<QuestionStage, string> = {
  intro_call:        'Intro Call',
  deep_dive:         'Deep Dive Calls',
  zoom:              'Zoom Call',
  visit:             'Campus Visit',
  research_homework: 'Research Homework',
}

export const PIPELINE_STAGES: { value: PipelineStage; label: string }[] = [
  { value: 'initial_contact', label: 'Text' },
  { value: 'call_1',          label: 'Call 1' },
  { value: 'call_2_plus',     label: 'Call 2+' },
  { value: 'zoom',            label: 'Zoom' },
  { value: 'visit',           label: 'Visit' },
  { value: 'decision',        label: 'Decision' },
]

export const COMM_TYPES: { value: CommType; label: string }[] = [
  { value: 'text',         label: 'Text / DM' },
  { value: 'call_1',       label: 'Phone call #1 (intro)' },
  { value: 'call_2_plus',  label: 'Phone call (deep dive)' },
  { value: 'zoom',         label: 'Zoom call' },
  { value: 'visit',        label: 'Campus visit' },
  { value: 'other',        label: 'Other' },
]

export const ENERGY_LEVELS: { value: EnergyLevel; label: string }[] = [
  { value: 'interested',      label: 'Interested' },
  { value: 'very_interested', label: 'Very interested' },
  { value: 'leaning',         label: 'Leaning' },
  { value: 'neutral',         label: 'Neutral' },
  { value: 'passed',          label: 'Passed' },
]

export const STAGE_ORDER: PipelineStage[] = ['initial_contact', 'call_1', 'call_2_plus', 'zoom', 'visit', 'decision']

export const STAGE_FOR_COMM: Partial<Record<CommType, PipelineStage>> = {
  text: 'initial_contact', call_1: 'call_1', call_2_plus: 'call_2_plus', zoom: 'zoom', visit: 'visit',
}
