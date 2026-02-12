/**
 * Lightweight mock for @lobehub/ui used in tests.
 *
 * The real barrel export re-exports EmojiPicker which transitively imports
 * @emoji-mart/data — a JSON file that fails on Node 22 ESM without
 * `type: "json"` import attribute. This mock provides stub implementations
 * of the components our codebase actually uses, avoiding the problematic
 * import chain entirely.
 *
 * Tests that need more specific behavior can override with their own
 * vi.mock('@lobehub/ui', ...) in the test file (vitest gives per-file
 * mocks higher priority than setup-file mocks).
 */
import React from 'react'

// Simple passthrough wrapper
const Passthrough = React.forwardRef<HTMLDivElement, any>(
  ({ children, ...props }, ref) =>
    React.createElement('div', { ...props, ref }, children)
)
Passthrough.displayName = 'LobeUIMock'

const Button = React.forwardRef<HTMLButtonElement, any>(
  ({ children, danger, variant, htmlType, type, ...props }, ref) =>
    React.createElement(
      'button',
      { ...props, type: htmlType ?? type, ref },
      children
    )
)
Button.displayName = 'LobeUIButtonMock'

// Keep dropdown content closed by default to match common initial UI state.
const DropdownMenuRoot = ({ children }: any) =>
  React.createElement('div', null, children)
const DropdownMenuTrigger = ({ children }: any) =>
  React.createElement(React.Fragment, null, children)
const DropdownMenuPortal = () => null
const DropdownMenuPositioner = ({ children }: any) =>
  React.createElement('div', null, children)
const DropdownMenuPopup = ({ children }: any) =>
  React.createElement('div', null, children)
const DropdownMenuItem = ({ children, ...props }: any) =>
  React.createElement('button', props, children)
const DropdownMenuSeparator = () => React.createElement('hr', null)
const DropdownMenuGroup = ({ children }: any) =>
  React.createElement('div', null, children)
const DropdownMenuGroupLabel = ({ children }: any) =>
  React.createElement('div', null, children)

// Modal mock — renders children inside a div with role="dialog" when open
function Modal({ children, open, onCancel, title, footer, ...rest }: any) {
  if (open === false) return null
  return React.createElement(
    'div',
    { role: 'dialog', ...rest },
    title && React.createElement('div', null, title),
    children,
    onCancel &&
      React.createElement(
        'button',
        { 'aria-label': 'Close', onClick: onCancel },
        'Close'
      ),
    footer
  )
}

// Dropdown mock — just renders trigger and children
function Dropdown({ children, menu }: any) {
  return React.createElement('div', null, children)
}

// ThemeProvider — passthrough
function ThemeProvider({ children }: any) {
  return React.createElement(React.Fragment, null, children)
}

// Toast stubs
function ToastHost() {
  return null
}
const toast = {
  success: () => {},
  error: () => {},
  info: () => {},
  warning: () => {},
}

export {
  Modal,
  Dropdown,
  ThemeProvider,
  ToastHost,
  toast,
  Button,
  DropdownMenuRoot,
  DropdownMenuTrigger,
  DropdownMenuPortal,
  DropdownMenuPositioner,
  DropdownMenuPopup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuGroupLabel,
  Passthrough as ScrollArea,
  Passthrough as DraggableSideNav,
  Passthrough as Markdown,
  Passthrough as Input,
  Passthrough as Checkbox,
  Passthrough as Select,
}
