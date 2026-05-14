import toast from 'react-hot-toast'

interface ActionOptions<T> {
  action: () => Promise<T>
  successMessage?: string
  errorMessage?: string
  onSuccess?: (result: T) => void | Promise<void>
  onError?: (message: string) => void
}

export function useApiAction() {
  async function runAction<T>({ action, successMessage, errorMessage, onSuccess, onError }: ActionOptions<T>): Promise<T | null> {
    try {
      const result = await action()
      if (successMessage) {
        toast.success(successMessage)
      }
      if (onSuccess) {
        await onSuccess(result)
      }
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : errorMessage ?? 'Request failed'
      toast.error(message)
      onError?.(message)
      return null
    }
  }

  return { runAction }
}
