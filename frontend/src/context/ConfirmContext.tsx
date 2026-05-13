import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { Button } from '../components/Button'

type ConfirmOptions = {
  title: string
  description: string
  confirmText?: string
  tone?: 'default' | 'danger'
}

type ConfirmState = ConfirmOptions & {
  open: boolean
  resolve?: (value: boolean) => void
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null)

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<ConfirmState>({
    open: false,
    title: '',
    description: '',
    confirmText: 'Confirm',
    tone: 'default',
  })

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({
        open: true,
        title: options.title,
        description: options.description,
        confirmText: options.confirmText ?? 'Confirm',
        tone: options.tone ?? 'default',
        resolve,
      })
    })
  }, [])

  const close = useCallback((value: boolean) => {
    state.resolve?.(value)
    setState((prev) => ({ ...prev, open: false, resolve: undefined }))
  }, [state])

  const value = useMemo(() => ({ confirm }), [confirm])

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {state.open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ng-ink/35 px-4">
          <div className="card w-full max-w-md p-5">
            <h3 className="text-lg font-bold text-ng-ink">{state.title}</h3>
            <p className="mt-2 text-sm text-ng-muted">{state.description}</p>
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant={state.tone === 'danger' ? 'danger' : 'primary'}
                onClick={() => close(true)}
              >
                {state.confirmText}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const context = useContext(ConfirmContext)
  if (!context) {
    throw new Error('useConfirm must be used inside ConfirmProvider')
  }
  return context
}
