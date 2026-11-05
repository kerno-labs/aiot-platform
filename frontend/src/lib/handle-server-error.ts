import { AxiosError } from 'axios'
import { toast } from 'sonner'

type ApiErrorResponseData = {
  title?: string
  message?: string
  error?: string
}

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Something went wrong!'
): string {
  if (
    error &&
    typeof error === 'object' &&
    'status' in error &&
    Number(error.status) === 204
  ) {
    return 'Content not found.'
  }

  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorResponseData | undefined
    return (
      data?.message || data?.error || data?.title || error.message || fallback
    )
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return fallback
}

export function handleServerError(error: unknown) {
  // eslint-disable-next-line no-console
  console.log(error)
  toast.error(getApiErrorMessage(error))
}
