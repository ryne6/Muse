export const TOOL_QUESTION_PREFIX = '__tool_question__:'

export interface QuestionRequestPayload {
  kind: 'question_request'
  toolCallId?: string
  question: string
  description?: string
  choices?: string[]
  allowFreeText?: boolean
  required?: boolean
  placeholder?: string
  submitLabel?: string
  skipLabel?: string
}
